<?php
declare(strict_types=1);

class AuthMiddleware
{
    // Staff roles (staff_users table)
    public const STAFF_ROLES = ['super_admin', 'admin', 'account_manager', 'support_admin', 'backoffice', 'auditor'];
    // External role (portal_users table)
    public const PORTAL_ROLES = ['domain_owner', 'distributor'];

    /**
     * Verify Bearer JWT and populate $request->user.
     * Blocks suspended accounts.
     */
    public static function authenticate(Request $request): void
    {
        $token = $request->bearerToken();
        if (!$token) Response::error('Unauthorized', 401);

        try {
            $payload = JwtHelper::decode($token);
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'TokenExpiredError') {
                Response::error('Session expired. Please log in again.', 401);
            }
            Response::error('Invalid token', 401);
        }

        $userId   = (int) ($payload['userId'] ?? 0);
        $userType = (string) ($payload['userType'] ?? ''); // 'staff' | 'portal'
        $role     = (string) ($payload['role'] ?? '');

        if ($userId === 0 || !$userType || !$role) {
            Response::error('Invalid token', 401);
        }

        // Check account is still active
        if ($userType === 'staff') {
            $user = Database::queryOne(
                'SELECT is_active FROM staff_users WHERE id = :id',
                [':id' => $userId]
            );
            if (!$user || !(bool) $user['is_active']) {
                Response::error('Your account has been suspended. Contact support.', 403);
            }
        } elseif ($userType === 'portal') {
            $table = $role === 'distributor' ? 'distributors' : 'portal_users';
            $user  = Database::queryOne(
                "SELECT is_active FROM $table WHERE id = :id",
                [':id' => $userId]
            );
            if (!$user || !(bool) $user['is_active']) {
                Response::error('Your account has been suspended. Contact support.', 403);
            }
        }

        $request->user = ['userId' => $userId, 'userType' => $userType, 'role' => $role];
    }

    /**
     * Returns a closure that allows only specific roles.
     * Must be used after authenticate().
     */
    public static function authorize(array $roles): callable
    {
        return function (Request $request) use ($roles): void {
            $user = $request->user;
            if (!$user || !in_array($user['role'], $roles, true)) {
                Response::error('Forbidden', 403);
            }
        };
    }

    /** Combined authenticate + authorize for staff routes. */
    public static function staffOnly(array $roles = []): array
    {
        $allowedRoles = $roles ?: self::STAFF_ROLES;
        return [
            [self::class, 'authenticate'],
            self::authorize($allowedRoles),
        ];
    }

    /** Super admin only. */
    public static function superAdminOnly(): array
    {
        return [
            [self::class, 'authenticate'],
            self::authorize(['super_admin']),
        ];
    }
}
