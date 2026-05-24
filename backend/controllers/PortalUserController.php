<?php
declare(strict_types=1);

/**
 * PortalUserController — Manage domain_owner portal accounts.
 *
 * Domain owners are portal_users linked to a billing_entity.
 * They can log in and manage all domains under that billing entity.
 *
 * Access: super_admin, admin, support_admin (read); super_admin, admin (write)
 */
class PortalUserController
{
    // ── List all portal users ─────────────────────────────────────────────────

    public function list(Request $req): void
    {
        $rows = Database::query(
            'SELECT pu.id, pu.name, pu.email, pu.is_active, pu.password_reset_required,
                    pu.last_login_at, pu.created_at,
                    be.id AS billing_entity_id, be.name AS billing_entity_name,
                    (SELECT COUNT(*) FROM domains d WHERE d.billing_entity_id = be.id AND d.is_active = 1) AS domain_count
             FROM portal_users pu
             JOIN billing_entities be ON be.id = pu.billing_entity_id
             ORDER BY pu.name'
        );
        Response::json(['data' => $rows]);
    }

    // ── Get single portal user ────────────────────────────────────────────────

    public function get(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::queryOne(
            'SELECT pu.id, pu.name, pu.email, pu.is_active, pu.password_reset_required,
                    pu.last_login_at, pu.created_at,
                    be.id AS billing_entity_id, be.name AS billing_entity_name
             FROM portal_users pu
             JOIN billing_entities be ON be.id = pu.billing_entity_id
             WHERE pu.id = :id',
            [':id' => $id]
        );
        if (!$row) Response::error('Not found.', 404);

        // Attach domains they can access
        $domains = Database::query(
            'SELECT id, name, ou_path, is_active FROM domains WHERE billing_entity_id = :beid ORDER BY name',
            [':beid' => $row['billing_entity_id']]
        );
        $row['domains'] = $domains;

        Response::json($row);
    }

    // ── Create portal user (domain_owner) ────────────────────────────────────

    public function create(Request $req): void
    {
        $b = $req->body;
        $name             = trim($b['name']             ?? '');
        $email            = strtolower(trim($b['email'] ?? ''));
        $billingEntityId  = (int) ($b['billing_entity_id'] ?? 0);
        $password         = $b['password'] ?? '';

        if (!$name || !$email || !$billingEntityId) {
            Response::error('name, email, and billing_entity_id are required.', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email address.', 422);
        }

        // Verify billing entity exists
        $be = Database::queryOne('SELECT id FROM billing_entities WHERE id = :id', [':id' => $billingEntityId]);
        if (!$be) Response::error('Billing entity not found.', 404);

        // Check duplicate
        $dupe = Database::queryOne('SELECT id FROM portal_users WHERE email = :e', [':e' => $email]);
        if ($dupe) Response::error('A portal user with this email already exists.', 409);

        // Generate password if not provided
        if (!$password) {
            $password = self::generatePassword();
        }
        $hash    = password_hash($password, PASSWORD_BCRYPT);
        $forceReset = empty($b['password']) ? 1 : 0;

        $id = Database::insert(
            'INSERT INTO portal_users (billing_entity_id, name, email, password_hash, password_reset_required)
             VALUES (:beid, :name, :email, :hash, :reset)',
            [':beid' => $billingEntityId, ':name' => $name, ':email' => $email, ':hash' => $hash, ':reset' => $forceReset]
        );

        AuditService::log(
            'PORTAL_USER_CREATED', 'staff', $req->user['userId'], $req->user['name'] ?? '', $req->user['role'],
            "portal_user:{$id}:{$email}", '',  $req->ip
        );

        Response::json([
            'id'               => $id,
            'email'            => $email,
            'password'         => $forceReset ? $password : null,  // return generated password once
            'message'          => 'Portal user created.',
        ], 201);
    }

    // ── Update portal user ────────────────────────────────────────────────────

    public function update(Request $req): void
    {
        $id = (int) $req->param('id');
        $b  = $req->body;

        $pu = Database::queryOne('SELECT id FROM portal_users WHERE id = :id', [':id' => $id]);
        if (!$pu) Response::error('Not found.', 404);

        $sets   = [];
        $params = [':id' => $id];

        if (isset($b['name']))  { $sets[] = 'name = :name';   $params[':name']  = trim($b['name']); }
        if (isset($b['is_active'])) { $sets[] = 'is_active = :active'; $params[':active'] = (int) $b['is_active']; }
        if (isset($b['billing_entity_id'])) {
            $be = Database::queryOne('SELECT id FROM billing_entities WHERE id = :id', [':id' => (int) $b['billing_entity_id']]);
            if (!$be) Response::error('Billing entity not found.', 404);
            $sets[] = 'billing_entity_id = :beid';
            $params[':beid'] = (int) $b['billing_entity_id'];
        }

        if (!$sets) Response::error('Nothing to update.', 400);

        Database::execute('UPDATE portal_users SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);

        AuditService::log(
            'PORTAL_USER_UPDATED', 'staff', $req->user['userId'], $req->user['name'] ?? '', $req->user['role'],
            "portal_user:{$id}", json_encode($b), $req->ip
        );

        Response::json(['message' => 'Updated.']);
    }

    // ── Reset portal user password (staff-initiated) ──────────────────────────

    public function resetPassword(Request $req): void
    {
        $id   = (int) $req->param('id');
        $pu   = Database::queryOne('SELECT id, email FROM portal_users WHERE id = :id', [':id' => $id]);
        if (!$pu) Response::error('Not found.', 404);

        $newPassword = self::generatePassword();
        $hash        = password_hash($newPassword, PASSWORD_BCRYPT);

        Database::execute(
            'UPDATE portal_users SET password_hash = :hash, password_reset_required = 1 WHERE id = :id',
            [':hash' => $hash, ':id' => $id]
        );

        AuditService::log(
            'PORTAL_USER_PASSWORD_RESET', 'staff', $req->user['userId'], $req->user['name'] ?? '', $req->user['role'],
            "portal_user:{$id}:{$pu['email']}", '', $req->ip
        );

        Response::json(['message' => 'Password reset.', 'new_password' => $newPassword]);
    }

    // ── Assign billing entity (re-link a portal user to different entity) ─────

    public function assignBillingEntity(Request $req): void
    {
        $id   = (int) $req->param('id');
        $beid = (int) ($req->body['billing_entity_id'] ?? 0);

        if (!$beid) Response::error('billing_entity_id required.', 422);
        $be = Database::queryOne('SELECT id FROM billing_entities WHERE id = :id', [':id' => $beid]);
        if (!$be) Response::error('Billing entity not found.', 404);

        Database::execute(
            'UPDATE portal_users SET billing_entity_id = :beid WHERE id = :id',
            [':beid' => $beid, ':id' => $id]
        );

        AuditService::log(
            'PORTAL_USER_REASSIGNED', 'staff', $req->user['userId'], $req->user['name'] ?? '', $req->user['role'],
            "portal_user:{$id}", "new_billing_entity:{$beid}", $req->ip
        );

        Response::json(['message' => 'Portal user reassigned.']);
    }

    private static function generatePassword(): string
    {
        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$!';
        $pass  = '';
        for ($i = 0; $i < 12; $i++) {
            $pass .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $pass;
    }
}
