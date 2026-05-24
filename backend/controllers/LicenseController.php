<?php
declare(strict_types=1);

class LicenseController
{
    // ── Plans ─────────────────────────────────────────────────────────────────

    public function getPlans(Request $req): void
    {
        $plans = Database::query('SELECT * FROM plans WHERE is_active = 1 ORDER BY price_per_year');
        Response::json(['data' => $plans]);
    }

    public function updatePlan(Request $req): void
    {
        $id = (int) $req->param('id');
        $b  = $req->body;
        $sets = []; $params = [':id' => $id, ':by' => $req->user['userId']];
        foreach (['price_per_year','name','color_hex','is_active'] as $f) {
            if (array_key_exists($f, $b)) { $sets[] = "$f = :$f"; $params[":$f"] = $b[$f]; }
        }
        $sets[] = 'updated_by = :by';
        Database::execute('UPDATE plans SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        AuditService::log('PRICING_UPDATED', 'staff', $req->user['userId'], '', $req->user['role'], '', json_encode($b), $req->ip);
        Response::json(['message' => 'Plan updated.']);
    }

    // ── License Pool ──────────────────────────────────────────────────────────

    public function getPool(Request $req): void
    {
        $beId = (int) $req->param('id');
        $pool = Database::query(
            'SELECT lp.*, p.price_per_year, p.name AS plan_name
             FROM license_pool lp
             JOIN plans p ON p.slug = lp.plan_slug
             WHERE lp.billing_entity_id = :id',
            [':id' => $beId]
        );
        Response::json(['data' => $pool]);
    }

    // ── Buy Licenses — initiate Zoho payment ──────────────────────────────────

    public function initiateBuy(Request $req): void
    {
        $beId     = (int) $req->param('id');
        $planSlug = (string) ($req->body['plan_slug'] ?? '');
        $quantity = (int) ($req->body['quantity'] ?? 0);
        $promo    = (string) ($req->body['promo_code'] ?? '');

        if (!$planSlug || $quantity < 1) {
            Response::error('plan_slug and quantity (≥1) required.', 400);
        }

        // Get plan price
        $plan = Database::queryOne('SELECT * FROM plans WHERE slug = :slug AND is_active = 1', [':slug' => $planSlug]);
        if (!$plan) Response::error('Plan not found.', 404);

        // Get billing entity renewal date → calculate pro-rata
        $be = Database::queryOne('SELECT renewal_date FROM billing_entities WHERE id = :id', [':id' => $beId]);
        if (!$be) Response::error('Billing entity not found.', 404);

        $today       = new DateTime('today');
        $renewal     = new DateTime($be['renewal_date']);
        $daysRemaining = (int) ceil($today->diff($renewal)->days + ($renewal > $today ? 0 : 365));
        // If renewal already passed, treat as full year
        if ($renewal <= $today) $daysRemaining = 365;

        $dailyRate     = $plan['price_per_year'] / 365;
        $proRataAmount = (float) ceil($dailyRate * $daysRemaining * $quantity * 100) / 100;

        // Apply promo code
        $discount = 0.0;
        if ($promo) {
            $code = Database::queryOne(
                'SELECT * FROM promo_codes WHERE code = :c AND is_active = 1
                 AND (expires_at IS NULL OR expires_at > NOW())
                 AND (usage_limit IS NULL OR usage_count < usage_limit)',
                [':c' => strtoupper($promo)]
            );
            if ($code) {
                $discount = $code['discount_type'] === 'percent'
                    ? round($proRataAmount * $code['discount_value'] / 100, 2)
                    : min((float) $code['discount_value'], $proRataAmount);
            }
        }

        $netAmount = max(0, $proRataAmount - $discount);
        $refNumber = 'LDIS-' . strtoupper(bin2hex(random_bytes(4)));

        // Create pending checkout
        $checkoutId = Database::insert(
            'INSERT INTO pending_checkouts
             (reference_number, checkout_type, billing_entity_id, plan_slug, quantity,
              amount, promo_code, customer_email, customer_name, initiated_by, expires_at)
             VALUES (:ref, "LICENSE_PURCHASE", :be, :plan, :qty,
                     :amt, :promo, :email, :name, :by, DATE_ADD(NOW(), INTERVAL 30 MINUTE))',
            [
                ':ref'   => $refNumber,
                ':be'    => $beId,
                ':plan'  => $planSlug,
                ':qty'   => $quantity,
                ':amt'   => $netAmount,
                ':promo' => $promo ?: null,
                ':email' => $req->body['customer_email'] ?? '',
                ':name'  => $req->body['customer_name'] ?? '',
                ':by'    => $req->user['userId'],
            ]
        );

        // Create Zoho payment session
        $session = ZohoPaymentService::createSession(
            $netAmount,
            $refNumber,
            "$quantity × {$plan['name']} license(s) — {$planSlug}",
            SITE_URL . '/billing/payment-complete'
        );

        Database::execute(
            'UPDATE pending_checkouts SET zoho_payment_id = :zpid WHERE id = :id',
            [':zpid' => $session['id'] ?? '', ':id' => $checkoutId]
        );

        Response::json([
            'reference_number'  => $refNumber,
            'amount'            => $netAmount,
            'pro_rata_days'     => $daysRemaining,
            'pro_rata_amount'   => $proRataAmount,
            'discount'          => $discount,
            'net_amount'        => $netAmount,
            'payment_session'   => $session,
        ]);
    }
}
