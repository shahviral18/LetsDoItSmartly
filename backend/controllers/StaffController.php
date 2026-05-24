<?php
declare(strict_types=1);

class StaffController
{
    public function list(Request $req): void
    {
        $staff = Database::query('SELECT id, name, email, role, is_active, last_login_at, created_at FROM staff_users ORDER BY name');
        Response::json(['data' => $staff]);
    }

    public function create(Request $req): void
    {
        $name  = trim((string) ($req->body['name'] ?? ''));
        $email = strtolower(trim((string) ($req->body['email'] ?? '')));
        $role  = (string) ($req->body['role'] ?? '');
        $pass  = (string) ($req->body['password'] ?? bin2hex(random_bytes(8)));

        $validRoles = ['admin','account_manager','support_admin','backoffice','auditor'];
        if (!$name || !$email || !in_array($role, $validRoles, true)) {
            Response::error('name, email, and valid role required.', 400);
        }
        if (Database::queryOne('SELECT id FROM staff_users WHERE email = :e', [':e' => $email])) {
            Response::error('Email already exists.', 409);
        }

        $id = Database::insert(
            'INSERT INTO staff_users (name, email, password_hash, role, password_reset_required)
             VALUES (:name, :email, :hash, :role, 1)',
            [':name' => $name, ':email' => $email, ':hash' => password_hash($pass, PASSWORD_BCRYPT, ['cost' => 10]), ':role' => $role]
        );
        AuditService::log('STAFF_CREATED', 'staff', $req->user['userId'], '', $req->user['role'], $email, "Role: $role", $req->ip);
        Response::json(['id' => $id, 'tempPassword' => $pass], 201);
    }

    public function update(Request $req): void
    {
        $id   = (int) $req->param('id');
        $data = $req->body;
        $sets = []; $params = [':id' => $id];

        if (isset($data['name']))      { $sets[] = 'name = :name';           $params[':name']      = $data['name']; }
        if (isset($data['role']))      { $sets[] = 'role = :role';           $params[':role']      = $data['role']; }
        if (isset($data['is_active'])) { $sets[] = 'is_active = :active';    $params[':active']    = (int)(bool)$data['is_active']; }

        if (!$sets) Response::error('Nothing to update.', 400);
        Database::execute('UPDATE staff_users SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        AuditService::log('STAFF_UPDATED', 'staff', $req->user['userId'], '', $req->user['role'], (string)$id, json_encode($data), $req->ip);
        Response::json(['message' => 'Updated.']);
    }

    public function delete(Request $req): void
    {
        $id = (int) $req->param('id');
        Database::execute('UPDATE staff_users SET is_active = 0 WHERE id = :id', [':id' => $id]);
        AuditService::log('STAFF_DEACTIVATED', 'staff', $req->user['userId'], '', $req->user['role'], (string)$id, '', $req->ip);
        Response::json(['message' => 'Staff member deactivated.']);
    }
}
