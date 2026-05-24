<?php
declare(strict_types=1);

class DomainController
{
    public function list(Request $req): void
    {
        $domains = Database::query(
            'SELECT d.*, be.name AS billing_entity_name,
                    COUNT(wu.id) AS user_count
             FROM domains d
             JOIN billing_entities be ON be.id = d.billing_entity_id
             LEFT JOIN workspace_users wu ON wu.domain_id = d.id
             GROUP BY d.id ORDER BY d.name'
        );
        Response::json(['data' => $domains]);
    }

    public function get(Request $req): void
    {
        $id = (int) $req->param('id');
        $d  = Database::queryOne(
            'SELECT d.*, be.name AS billing_entity_name FROM domains d
             JOIN billing_entities be ON be.id = d.billing_entity_id
             WHERE d.id = :id',
            [':id' => $id]
        );
        if (!$d) Response::error('Not found', 404);
        $d['user_count'] = Database::count('workspace_users', 'domain_id = :id', [':id' => $id]);
        Response::json($d);
    }

    public function create(Request $req): void
    {
        $b = $req->body;
        if (empty($b['name']) || empty($b['billing_entity_id'])) {
            Response::error('name and billing_entity_id required.', 400);
        }
        $name = strtolower(trim($b['name']));
        if (Database::queryOne('SELECT id FROM domains WHERE name = :n', [':n' => $name])) {
            Response::error('Domain already exists.', 409);
        }
        // Auto-build ou_path from billing entity slug if not provided
        $ouPath = $b['ou_path'] ?? null;
        if (!$ouPath) {
            $be     = Database::queryOne('SELECT slug FROM billing_entities WHERE id = :id', [':id' => $b['billing_entity_id']]);
            $ouPath = 'defaultOU/' . ($be['slug'] ?? 'client');
        }
        $id = Database::insert(
            'INSERT INTO domains (billing_entity_id, name, ou_path) VALUES (:be, :name, :ou)',
            [':be' => $b['billing_entity_id'], ':name' => $name, ':ou' => $ouPath]
        );
        AuditService::log('DOMAIN_ADDED', 'staff', $req->user['userId'], '', $req->user['role'], $name, '', $req->ip);
        Response::json(['id' => $id], 201);
    }

    public function update(Request $req): void
    {
        $id = (int) $req->param('id');
        $b  = $req->body;
        $sets = []; $params = [':id' => $id];
        foreach (['ou_path','is_active'] as $f) {
            if (array_key_exists($f, $b)) { $sets[] = "$f = :$f"; $params[":$f"] = $b[$f]; }
        }
        if (!$sets) Response::error('Nothing to update.', 400);
        Database::execute('UPDATE domains SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        Response::json(['message' => 'Updated.']);
    }

    public function myDomains(Request $req): void
    {
        $userId = $req->user['userId'];
        $user   = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $userId]);
        if (!$user) Response::error('User not found', 404);

        $domains = Database::query(
            'SELECT d.*, COUNT(wu.id) AS user_count
             FROM domains d
             LEFT JOIN workspace_users wu ON wu.domain_id = d.id
             WHERE d.billing_entity_id = :be AND d.is_active = 1
             GROUP BY d.id ORDER BY d.name',
            [':be' => $user['billing_entity_id']]
        );
        Response::json(['data' => $domains]);
    }
}
