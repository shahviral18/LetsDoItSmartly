<?php
declare(strict_types=1);

class InvoiceController
{
    public function list(Request $req): void
    {
        $user = $req->user;
        if ($user['role'] === 'domain_owner') {
            $pu   = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $user['userId']]);
            $rows = Database::query('SELECT * FROM invoices WHERE billing_entity_id = :be ORDER BY invoice_date DESC', [':be' => $pu['billing_entity_id']]);
        } else {
            $rows = Database::query('SELECT * FROM invoices ORDER BY invoice_date DESC LIMIT 200');
        }
        Response::json(['data' => $rows]);
    }

    public function get(Request $req): void
    {
        $id  = (int) $req->param('id');
        $inv = Database::queryOne('SELECT * FROM invoices WHERE id = :id', [':id' => $id]);
        if (!$inv) Response::error('Not found', 404);
        Response::json($inv);
    }

    public function adminList(Request $req): void
    {
        $beId = $req->query['billing_entity_id'] ?? null;
        if ($beId) {
            $rows = Database::query('SELECT * FROM invoices WHERE billing_entity_id = :be ORDER BY invoice_date DESC', [':be' => $beId]);
        } else {
            $rows = Database::query('SELECT i.*, be.name AS billing_entity_name FROM invoices i JOIN billing_entities be ON be.id = i.billing_entity_id ORDER BY i.invoice_date DESC LIMIT 200');
        }
        Response::json(['data' => $rows]);
    }
}
