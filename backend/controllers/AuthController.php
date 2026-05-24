<?php
declare(strict_types=1);

/**
 * AuthController — handles both staff and portal (domain_owner/distributor) login.
 *
 * Routes:
 *   POST /api/auth/login          — staff + portal unified login
 *   GET  /api/auth/me             — return current user info
 *   POST /api/auth/logout         — revoke session token
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *   POST /api/auth/change-password [auth]
 */
class AuthController
{
    // ── Login ─────────────────────────────────────────────────────────────────

    public function login(Request $req): void
    {
        $email    = strtolower(trim((string) ($req->body['email'] ?? '')));
        $password = (string) ($req->body['password'] ?? '');

        if (!$email || !$password) {
            Response::error('Email and password are required.', 400);
        }

        // Try staff_users first
        $user = Database::queryOne(
            'SELECT id, name, email, password_hash, role, is_active, password_reset_required
             FROM staff_users WHERE email = :email',
            [':email' => $email]
        );
        $userType = 'staff';

        // Then portal_users
        if (!$user) {
            $user = Database::queryOne(
                'SELECT id, name, email, password_hash, role, is_active, password_reset_required,
                        billing_entity_id
                 FROM portal_users WHERE email = :email',
                [':email' => $email]
            );
            $userType = 'portal';
        }

        // Then distributors
        if (!$user) {
            $user = Database::queryOne(
                'SELECT id, name, email, password_hash, "distributor" AS role, is_active,
                        password_reset_required, NULL AS billing_entity_id
                 FROM distributors WHERE email = :email AND status != "pending"',
                [':email' => $email]
            );
            $userType = 'portal';
        }

        if (!$user || !password_verify($password, $user['password_hash'])) {
            AuditService::log('LOGIN_FAILED', $userType, null, '', '', $email, 'Invalid credentials', $req->ip);
            Response::error('Invalid email or password.', 401);
        }

        if (!(bool) $user['is_active']) {
            Response::error('Your account has been suspended. Contact support.', 403);
        }

        $token = JwtHelper::encode([
            'userId'   => $user['id'],
            'userType' => $userType,
            'role'     => $user['role'],
        ]);

        // Track session
        Database::insert(
            'INSERT INTO user_sessions (user_type, user_id, token_hash, ip_address, user_agent, expires_at)
             VALUES (:type, :uid, :hash, :ip, :ua, DATE_ADD(NOW(), INTERVAL 7 DAY))',
            [
                ':type' => $userType,
                ':uid'  => $user['id'],
                ':hash' => hash('sha256', $token),
                ':ip'   => $req->ip ?? '',
                ':ua'   => $req->header('user-agent') ?? '',
            ]
        );

        // Update last login
        $table = $userType === 'staff' ? 'staff_users' : (($user['role'] === 'distributor') ? 'distributors' : 'portal_users');
        Database::execute("UPDATE $table SET last_login_at = NOW() WHERE id = :id", [':id' => $user['id']]);

        AuditService::log('LOGIN', $userType, $user['id'], $user['name'], $user['role'], $email, '', $req->ip);

        $responseData = [
            'token' => $token,
            'user'  => [
                'id'       => $user['id'],
                'name'     => $user['name'],
                'email'    => $user['email'],
                'role'     => $user['role'],
                'userType' => $userType,
                'passwordResetRequired' => (bool) $user['password_reset_required'],
            ],
        ];

        if ($userType === 'portal' && isset($user['billing_entity_id'])) {
            $responseData['user']['billingEntityId'] = $user['billing_entity_id'];
        }

        Response::json($responseData);
    }

    // ── Me ────────────────────────────────────────────────────────────────────

    public function me(Request $req): void
    {
        $userId   = $req->user['userId'];
        $userType = $req->user['userType'];
        $role     = $req->user['role'];

        if ($userType === 'staff') {
            $user = Database::queryOne(
                'SELECT id, name, email, role, is_active, password_reset_required, last_login_at
                 FROM staff_users WHERE id = :id',
                [':id' => $userId]
            );
        } elseif ($role === 'distributor') {
            $user = Database::queryOne(
                'SELECT id, name, email, "distributor" AS role, is_active, password_reset_required, last_login_at
                 FROM distributors WHERE id = :id',
                [':id' => $userId]
            );
        } else {
            $user = Database::queryOne(
                'SELECT id, name, email, role, is_active, password_reset_required, last_login_at, billing_entity_id
                 FROM portal_users WHERE id = :id',
                [':id' => $userId]
            );
        }

        if (!$user) Response::error('User not found', 404);

        Response::json(['user' => array_merge($user, ['userType' => $userType])]);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public function logout(Request $req): void
    {
        $token = $req->bearerToken();
        if ($token) {
            Database::execute(
                'UPDATE user_sessions SET is_revoked = 1 WHERE token_hash = :hash',
                [':hash' => hash('sha256', $token)]
            );
        }
        Response::json(['message' => 'Logged out successfully.']);
    }

    // ── Forgot Password ───────────────────────────────────────────────────────

    public function forgotPassword(Request $req): void
    {
        $email = strtolower(trim((string) ($req->body['email'] ?? '')));
        if (!$email) Response::error('Email is required.', 400);

        // Find in either table
        $user     = Database::queryOne('SELECT id, name FROM staff_users WHERE email = :e', [':e' => $email]);
        $userType = 'staff';
        if (!$user) {
            $user     = Database::queryOne('SELECT id, name FROM portal_users WHERE email = :e', [':e' => $email]);
            $userType = 'portal';
        }

        // Always return success (don't reveal if email exists)
        if ($user) {
            $token = bin2hex(random_bytes(32));
            Database::insert(
                'INSERT INTO security_links (token, user_type, user_id, link_type, expires_at)
                 VALUES (:token, :type, :uid, "password_reset", DATE_ADD(NOW(), INTERVAL 1 HOUR))',
                [':token' => $token, ':type' => $userType, ':uid' => $user['id']]
            );
            // TODO: send email with reset link = SITE_URL/reset-password?token=$token
            Logger::info("[Auth] Password reset token for $email: $token");
        }

        Response::json(['message' => 'If that email is registered, a reset link has been sent.']);
    }

    // ── Reset Password ────────────────────────────────────────────────────────

    public function resetPassword(Request $req): void
    {
        $token    = (string) ($req->body['token'] ?? '');
        $password = (string) ($req->body['password'] ?? '');

        if (!$token || strlen($password) < 8) {
            Response::error('Token and password (min 8 chars) are required.', 400);
        }

        $link = Database::queryOne(
            'SELECT * FROM security_links
             WHERE token = :token AND status = "pending" AND expires_at > NOW()',
            [':token' => $token]
        );

        if (!$link) Response::error('Invalid or expired reset link.', 400);

        $hash  = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
        $table = $link['user_type'] === 'staff' ? 'staff_users' : 'portal_users';

        Database::execute(
            "UPDATE $table SET password_hash = :hash, password_reset_required = 0 WHERE id = :id",
            [':hash' => $hash, ':id' => $link['user_id']]
        );

        Database::execute(
            'UPDATE security_links SET status = "used", used_at = NOW() WHERE id = :id',
            [':id' => $link['id']]
        );

        Response::json(['message' => 'Password reset successfully.']);
    }

    // ── Change Password ───────────────────────────────────────────────────────

    public function changePassword(Request $req): void
    {
        $current = (string) ($req->body['currentPassword'] ?? '');
        $new     = (string) ($req->body['newPassword'] ?? '');

        if (!$current || strlen($new) < 8) {
            Response::error('Current password and new password (min 8 chars) required.', 400);
        }

        $userId   = $req->user['userId'];
        $userType = $req->user['userType'];
        $role     = $req->user['role'];
        $table    = $userType === 'staff' ? 'staff_users' : ($role === 'distributor' ? 'distributors' : 'portal_users');

        $user = Database::queryOne("SELECT password_hash FROM $table WHERE id = :id", [':id' => $userId]);
        if (!$user || !password_verify($current, $user['password_hash'])) {
            Response::error('Current password is incorrect.', 401);
        }

        $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 10]);
        Database::execute(
            "UPDATE $table SET password_hash = :hash, password_reset_required = 0 WHERE id = :id",
            [':hash' => $hash, ':id' => $userId]
        );

        AuditService::log('PASSWORD_CHANGED', $userType, $userId, '', $role, '', '', $req->ip);
        Response::json(['message' => 'Password changed successfully.']);
    }
}
