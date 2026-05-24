<?php
declare(strict_types=1);

class BillingEntityController
{
    public function list(Request $req): void
    {
        $entities = Database::query(
            'SELECT be.*, COUNT(d.id) AS domain_count
             FROM billing_entities be
             LEFT JOIN domains d ON d.billing_entity_id = be.id
             GROUP BY be.id ORDER BY be.name'
        );
        // Attach license pool summary
        foreach ($entities as &$e) {
            $pool = Database::query(
                'SELECT plan_slug, allocated, used FROM license_pool WHERE billing_entity_id = :id',
                [':id' => $e['id']]
            );
            $e['license_pool'] = $pool;
        }
        Response::json(['data' => $entities]);
    }

    public function get(Request $req): void
    {
        $id = (int) $req->param('id');
        $e  = Database::queryOne('SELECT * FROM billing_entities WHERE id = :id', [':id' => $id]);
        if (!$e) Response::error('Not found', 404);

        $e['domains']      = Database::query('SELECT * FROM domains WHERE billing_entity_id = :id', [':id' => $id]);
        $e['license_pool'] = Database::query('SELECT * FROM license_pool WHERE billing_entity_id = :id', [':id' => $id]);
        Response::json($e);
    }

    public function create(Request $req): void
    {
        $b = $req->body;
        $required = ['name', 'slug', 'contact_email', 'renewal_date'];
        foreach ($required as $f) {
            if (empty($b[$f])) Response::error("$f is required.", 400);
        }

        $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower($b['slug']));
        if (Database::queryOne('SELECT id FROM billing_entities WHERE slug = :s', [':s' => $slug])) {
            Response::error('Slug already exists.', 409);
        }

        $id = Database::insert(
            'INSERT INTO billing_entities (name, slug, gst_number, contact_email, contact_phone, address, renewal_date, distributor_id)
             VALUES (:name, :slug, :gst, :email, :phone, :addr, :renewal, :dist)',
            [
                ':name'    => $b['name'],
                ':slug'    => $slug,
                ':gst'     => $b['gst_number'] ?? null,
                ':email'   => $b['contact_email'],
                ':phone'   => $b['contact_phone'] ?? null,
                ':addr'    => $b['address'] ?? null,
                ':renewal' => $b['renewal_date'],
                ':dist'    => $b['distributor_id'] ?? null,
            ]
        );

        // Seed empty license pool rows for all 4 plans
        foreach (['basic', 'pro', 'enterprise', 'premium'] as $plan) {
            Database::execute(
                'INSERT IGNORE INTO license_pool (billing_entity_id, plan_slug) VALUES (:id, :plan)',
                [':id' => $id, ':plan' => $plan]
            );
        }

        AuditService::log('BILLING_ENTITY_CREATED', 'staff', $req->user['userId'], '', $req->user['role'], $b['name'], '', $req->ip);
        Response::json(['id' => $id], 201);
    }

    public function update(Request $req): void
    {
        $id = (int) $req->param('id');
        $b  = $req->body;
        $sets = []; $params = [':id' => $id];

        $fields = ['name','gst_number','contact_email','contact_phone','address','renewal_date','distributor_id',
                   'welcome_email_sender_name','welcome_email_body'];
        foreach ($fields as $f) {
            if (array_key_exists($f, $b)) {
                $sets[] = "$f = :$f";
                $params[":$f"] = $b[$f];
            }
        }
        if (!$sets) Response::error('Nothing to update.', 400);
        Database::execute('UPDATE billing_entities SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        AuditService::log('BILLING_ENTITY_UPDATED', 'staff', $req->user['userId'], '', $req->user['role'], (string)$id, '', $req->ip);
        Response::json(['message' => 'Updated.']);
    }
}
