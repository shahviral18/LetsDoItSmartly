<?php
declare(strict_types=1);

class BccController
{
    public function list(Request $req): void
    {
        $user = $req->user;
        if ($user['role'] === 'domain_owner') {
            $pu   = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $user['userId']]);
            $rows = Database::query('SELECT * FROM bcc_requests WHERE billing_entity_id = :be ORDER BY requested_at DESC', [':be' => $pu['billing_entity_id']]);
        } else {
            $rows = Database::query('SELECT * FROM bcc_requests ORDER BY requested_at DESC');
        }
        // Decode JSON fields
        foreach ($rows as &$r) {
            $r['affected_users'] = json_decode($r['affected_users'], true);
            $r['directions']     = json_decode($r['directions'], true);
        }
        Response::json(['data' => $rows]);
    }

    public function get(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::queryOne('SELECT * FROM bcc_requests WHERE id = :id', [':id' => $id]);
        if (!$row) Response::error('Not found', 404);
        if ($req->user['role'] === 'domain_owner') {
            $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
            if ((int)$row['billing_entity_id'] !== (int)$pu['billing_entity_id']) Response::error('Not found', 404);
        }
        $row['affected_users'] = json_decode($row['affected_users'], true);
        $row['directions']     = json_decode($row['directions'], true);
        Response::json($row);
    }

    public function create(Request $req): void
    {
        $b = $req->body;
        foreach (['domain_id','surveillance_email','directions'] as $f) {
            if (empty($b[$f])) Response::error("$f is required.", 400);
        }

        $userId = $req->user['userId'];
        $pu     = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $userId]);
        $domain = Database::queryOne('SELECT * FROM domains WHERE id = :id', [':id' => $b['domain_id']]);
        if (!$domain) Response::error('Domain not found.', 404);

        $id = Database::insert(
            'INSERT INTO bcc_requests
             (billing_entity_id, domain_id, ou_path, affected_users, surveillance_email, directions, requested_by)
             VALUES (:be, :did, :ou, :users, :email, :dirs, :by)',
            [
                ':be'    => $pu['billing_entity_id'],
                ':did'   => $b['domain_id'],
                ':ou'    => $domain['ou_path'],
                ':users' => json_encode($b['affected_users'] ?? 'all'),
                ':email' => $b['surveillance_email'],
                ':dirs'  => json_encode($b['directions']),
                ':by'    => $userId,
            ]
        );
        AuditService::log('BCC_REQUEST_SUBMITTED', 'portal', $userId, '', 'domain_owner', $domain['name'], '', $req->ip);
        Response::json(['id' => $id], 201);
    }

    public function updateStatus(Request $req): void
    {
        $id     = (int) $req->param('id');
        $status = (string) ($req->body['status'] ?? '');
        $notes  = (string) ($req->body['notes'] ?? '');

        $valid = ['pending', 'in_progress', 'completed', 'rejected'];
        if (!in_array($status, $valid, true)) Response::error('Invalid status.', 400);

        $sets = ['status = :status'];
        $params = [':id' => $id, ':status' => $status];

        if (in_array($status, ['completed', 'rejected'], true)) {
            $sets[] = 'completed_by = :by';
            $sets[] = 'completed_at = NOW()';
            $params[':by'] = $req->user['userId'];
        }
        if ($notes) {
            $sets[] = 'notes = :notes';
            $params[':notes'] = $notes;
        }

        Database::execute('UPDATE bcc_requests SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        AuditService::log('BCC_STATUS_UPDATED', 'staff', $req->user['userId'], '', $req->user['role'], (string)$id, "Status: $status", $req->ip);
        Response::json(['message' => 'Status updated.']);
    }
}
