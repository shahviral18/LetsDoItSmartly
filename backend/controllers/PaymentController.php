<?php
declare(strict_types=1);

class PaymentController
{
    public function createSession(Request $req): void
    {
        // Generic session creator — used by frontend polling flow
        $ref = (string) ($req->body['reference_number'] ?? '');
        if (!$ref) Response::error('reference_number required.', 400);

        $checkout = Database::queryOne(
            'SELECT * FROM pending_checkouts WHERE reference_number = :ref AND status = "pending"',
            [':ref' => $ref]
        );
        if (!$checkout) Response::error('Checkout not found or already processed.', 404);

        $session = ZohoPaymentService::createSession(
            (float) $checkout['amount'],
            $ref,
            'License purchase — ' . $checkout['plan_slug'],
            SITE_URL . '/billing/payment-complete'
        );
        Response::json(['payment_session' => $session]);
    }

    public function getStatus(Request $req): void
    {
        $ref = $req->query['ref'] ?? '';
        if (!$ref) Response::error('ref required.', 400);

        $checkout = Database::queryOne(
            'SELECT * FROM pending_checkouts WHERE reference_number = :ref',
            [':ref' => $ref]
        );
        if (!$checkout) Response::error('Not found', 404);

        if ($checkout['status'] === 'paid') {
            Response::json(['status' => 'paid']);
        }

        // Poll Zoho
        if ($checkout['zoho_payment_id']) {
            $zohoStatus = ZohoPaymentService::getSessionStatus($checkout['zoho_payment_id']);
            if ($zohoStatus === 'paid') {
                self::fulfillCheckout($checkout);
                Response::json(['status' => 'paid']);
            }
        }

        Response::json(['status' => $checkout['status']]);
    }

    public function zohoWebhook(Request $req): void
    {
        $sig = $req->header('x_zoho_webhook_signature') ?? '';
        if (!ZohoPaymentService::verifyWebhookSignature($req->rawBody, $sig)) {
            Logger::warn('[Webhook] Invalid signature');
            Response::error('Forbidden', 403);
        }

        $data = json_decode($req->rawBody, true);
        $ref  = $data['reference_number'] ?? ($data['payload']['reference_number'] ?? '');
        if (!$ref) { Response::json(['received' => true]); }

        $checkout = Database::queryOne(
            'SELECT * FROM pending_checkouts WHERE reference_number = :ref AND status = "pending"',
            [':ref' => $ref]
        );
        if ($checkout) {
            self::fulfillCheckout($checkout);
        }

        Response::json(['received' => true]);
    }

    private static function fulfillCheckout(array $checkout): void
    {
        Database::beginTransaction();
        try {
            $beId = (int) $checkout['billing_entity_id'];
            $plan = $checkout['plan_slug'];
            $qty  = (int) $checkout['quantity'];

            // Mark checkout paid
            Database::execute(
                'UPDATE pending_checkouts SET status = "paid" WHERE id = :id',
                [':id' => $checkout['id']]
            );

            // Add to license pool
            Database::execute(
                'UPDATE license_pool SET allocated = allocated + :qty WHERE billing_entity_id = :be AND plan_slug = :plan',
                [':qty' => $qty, ':be' => $beId, ':plan' => $plan]
            );

            // Record license purchase
            $plan_row = Database::queryOne('SELECT price_per_year FROM plans WHERE slug = :s', [':s' => $plan]);
            $purchaseId = Database::insert(
                'INSERT INTO license_purchases
                 (billing_entity_id, plan_slug, quantity, price_per_year, pro_rata_days, pro_rata_amount, discount_amount, net_amount, promo_code, payment_status, zoho_payment_id)
                 VALUES (:be, :plan, :qty, :ppy, 365, :amt, 0, :amt, :promo, "paid", :zpid)',
                [
                    ':be'    => $beId,
                    ':plan'  => $plan,
                    ':qty'   => $qty,
                    ':ppy'   => $plan_row['price_per_year'] ?? 0,
                    ':amt'   => $checkout['amount'],
                    ':promo' => $checkout['promo_code'],
                    ':zpid'  => $checkout['zoho_payment_id'],
                ]
            );

            // Create Zoho Books invoice (Option B format)
            try {
                $be = Database::queryOne('SELECT * FROM billing_entities WHERE id = :id', [':id' => $beId]);
                $planFull = Database::queryOne('SELECT * FROM plans WHERE slug = :s', [':s' => $plan]);
                $result = ZohoBooksService::createAndSendInvoice([
                    'planName'        => $planFull['name'],
                    'username'        => $checkout['customer_email'],
                    'customerName'    => $checkout['customer_name'],
                    'customerEmail'   => $checkout['customer_email'],
                    'customerPhone'   => $checkout['customer_phone'] ?? '',
                    'companyName'     => $be['name'],
                    'gstNumber'       => $be['gst_number'] ?? '',
                    'billingAddress'  => ['address' => $be['address'] ?? '', 'state' => '', 'country' => 'India'],
                    'billingPeriod'   => 'yearly',
                    'activationDate'  => date('Y-m-d H:i:s'),
                    'renewalDate'     => $be['renewal_date'] . ' 00:00:00',
                    'baseAmount'      => (float) $checkout['amount'],
                    'referenceNumber' => $checkout['reference_number'],
                    'orderId'         => $purchaseId,
                ]);

                Database::execute(
                    'UPDATE license_purchases SET zoho_invoice_id = :iid, zoho_invoice_number = :inum, payment_status = "paid" WHERE id = :id',
                    [':iid' => $result['invoice_id'] ?? '', ':inum' => $result['invoice_number'] ?? '', ':id' => $purchaseId]
                );

                // Save invoice record
                Database::insert(
                    'INSERT INTO invoices (billing_entity_id, license_purchase_id, zoho_invoice_id, invoice_number, invoice_date, due_date, plan_slug, description, rate, qty, net_amount, total_amount, status)
                     VALUES (:be, :pid, :iid, :inum, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), :plan, :desc, :rate, :qty, :amt, :amt, "paid")',
                    [
                        ':be'   => $beId, ':pid' => $purchaseId,
                        ':iid'  => $result['invoice_id'] ?? '',
                        ':inum' => $result['invoice_number'] ?? '',
                        ':plan' => $plan,
                        ':desc' => "License purchase — $qty × {$planFull['name']}",
                        ':rate' => $planFull['price_per_year'],
                        ':qty'  => $qty,
                        ':amt'  => $checkout['amount'],
                    ]
                );
            } catch (Throwable $e) {
                Logger::error('[Payment] Zoho Books invoice failed: ' . $e->getMessage());
                // Non-fatal — license is still fulfilled
            }

            Database::commit();
            Logger::info("[Payment] Fulfilled checkout {$checkout['reference_number']} — $qty × $plan for entity $beId");
        } catch (Throwable $e) {
            Database::rollback();
            Logger::error('[Payment] fulfillCheckout failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
