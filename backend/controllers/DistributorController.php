<?php
declare(strict_types=1);

class DistributorController
{
    public function dashboard(Request $req): void
    {
        $id      = $req->user['userId'];
        $dist    = Database::queryOne('SELECT id, name, email, wallet_balance, commission_rate FROM distributors WHERE id = :id', [':id' => $id]);
        $clients = Database::query('SELECT be.id, be.name, be.renewal_date FROM billing_entities be WHERE be.distributor_id = :id', [':id' => $id]);
        $pending = Database::scalar('SELECT SUM(commission_earned) FROM distributor_sales WHERE distributor_id = :id AND status = "pending"', [':id' => $id]);
        Response::json(['distributor' => $dist, 'clients' => $clients, 'pending_commission' => $pending ?? 0]);
    }

    public function clients(Request $req): void
    {
        $id = $req->user['userId'];
        $clients = Database::query(
            'SELECT be.*, SUM(lp.allocated) AS total_licenses
             FROM billing_entities be
             LEFT JOIN license_pool lp ON lp.billing_entity_id = be.id
             WHERE be.distributor_id = :id
             GROUP BY be.id ORDER BY be.name',
            [':id' => $id]
        );
        Response::json(['data' => $clients]);
    }

    public function payouts(Request $req): void
    {
        $id   = $req->user['userId'];
        $rows = Database::query('SELECT * FROM distributor_payouts WHERE distributor_id = :id ORDER BY created_at DESC', [':id' => $id]);
        Response::json(['data' => $rows]);
    }

    public function requestPayout(Request $req): void
    {
        $id     = $req->user['userId'];
        $amount = (float) ($req->body['amount'] ?? 0);
        $dist   = Database::queryOne('SELECT wallet_balance FROM distributors WHERE id = :id', [':id' => $id]);
        if ($amount <= 0 || $amount > (float) $dist['wallet_balance']) {
            Response::error('Invalid amount or insufficient balance.', 400);
        }
        $pid = Database::insert(
            'INSERT INTO distributor_payouts (distributor_id, amount) VALUES (:id, :amt)',
            [':id' => $id, ':amt' => $amount]
        );
        Response::json(['id' => $pid, 'message' => 'Payout request submitted.'], 201);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public function adminList(Request $req): void
    {
        $rows = Database::query('SELECT id, name, email, status, commission_rate, wallet_balance, created_at FROM distributors ORDER BY name');
        Response::json(['data' => $rows]);
    }

    public function adminUpdate(Request $req): void
    {
        $id = (int) $req->param('id');
        $b  = $req->body;
        $sets = []; $params = [':id' => $id];
        foreach (['status','commission_rate'] as $f) {
            if (isset($b[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $b[$f]; }
        }
        if (!$sets) Response::error('Nothing to update.', 400);
        Database::execute('UPDATE distributors SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        Response::json(['message' => 'Updated.']);
    }

    public function adminPayout(Request $req): void
    {
        $id     = (int) $req->param('id');
        $status = (string) ($req->body['status'] ?? '');
        $utr    = (string) ($req->body['utr_number'] ?? '');
        $note   = (string) ($req->body['admin_note'] ?? '');

        if (!in_array($status, ['processing','paid','rejected'], true)) Response::error('Invalid status.', 400);

        $payout = Database::queryOne('SELECT * FROM distributor_payouts WHERE id = :id', [':id' => $id]);
        if (!$payout) Response::error('Not found', 404);

        Database::execute(
            'UPDATE distributor_payouts SET status = :s, utr_number = :utr, admin_note = :note, processed_by = :by WHERE id = :id',
            [':s' => $status, ':utr' => $utr ?: null, ':note' => $note ?: null, ':by' => $req->user['userId'], ':id' => $id]
        );

        // If paid, deduct from wallet
        if ($status === 'paid') {
            Database::execute(
                'UPDATE distributors SET wallet_balance = wallet_balance - :amt WHERE id = :did',
                [':amt' => $payout['amount'], ':did' => $payout['distributor_id']]
            );
        }
        Response::json(['message' => 'Payout updated.']);
    }
}
