<?php
/**
 * Renewal Reminder Cron — run daily via cPanel Cron Jobs
 * URL: https://mails.letsdoitsmartly.com/api/cron/run-renewals
 * OR direct: php /path/to/cron/renewal-reminders.php
 *
 * Logic:
 *   - Find billing entities renewing in 7, 3, or 1 days
 *   - Send reminder email if not already sent for this cycle
 *   - Auto-suspend all users if renewal_date has passed + no payment in last 3 days
 */

declare(strict_types=1);

define('BASE_PATH', dirname(__DIR__));
require BASE_PATH . '/helpers/Logger.php';
require BASE_PATH . '/config/env.php';
require BASE_PATH . '/config/database.php';

// Validate cron token if called via HTTP
if (php_sapi_name() !== 'cli') {
    $token = $_GET['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) {
        http_response_code(403);
        die(json_encode(['error' => 'Forbidden']));
    }
}

$today    = date('Y-m-d');
$reminded = 0;
$suspended = 0;

// ── Send reminders ─────────────────────────────────────────────────────────────
foreach ([7, 3, 1] as $days) {
    $targetDate = date('Y-m-d', strtotime("+$days days"));
    $entities   = Database::query(
        'SELECT be.* FROM billing_entities be
         WHERE be.renewal_date = :date AND be.auto_suspend = 0',
        [':date' => $targetDate]
    );

    foreach ($entities as $be) {
        // Check if reminder already sent this cycle
        $sent = Database::queryOne(
            'SELECT id FROM renewal_reminders
             WHERE billing_entity_id = :id AND reminder_day = :day AND renewal_date = :rd',
            [':id' => $be['id'], ':day' => $days, ':rd' => $be['renewal_date']]
        );
        if ($sent) continue;

        // TODO: Send email via SMTP
        // EmailService::sendRenewalReminder($be, $days);
        Logger::info("[Cron] Renewal reminder ($days days) → {$be['name']} ({$be['contact_email']}) — renewal: {$be['renewal_date']}");

        Database::insert(
            'INSERT INTO renewal_reminders (billing_entity_id, reminder_day, renewal_date) VALUES (:id, :day, :rd)',
            [':id' => $be['id'], ':day' => $days, ':rd' => $be['renewal_date']]
        );
        $reminded++;
    }
}

// ── Auto-suspend overdue billing entities (3 days grace after renewal_date) ──
$suspendBefore = date('Y-m-d', strtotime('-3 days'));
$overdue = Database::query(
    'SELECT * FROM billing_entities WHERE renewal_date <= :date AND auto_suspend = 0',
    [':date' => $suspendBefore]
);

foreach ($overdue as $be) {
    // Check if any payment was made after renewal_date
    $paid = Database::queryOne(
        'SELECT id FROM license_purchases
         WHERE billing_entity_id = :id AND payment_status = "paid" AND created_at >= :rd',
        [':id' => $be['id'], ':rd' => $be['renewal_date']]
    );
    if ($paid) continue; // Renewed — skip

    // Suspend all active workspace users
    $users = Database::query(
        'SELECT id, email FROM workspace_users WHERE billing_entity_id = :id AND status = "active"',
        [':id' => $be['id']]
    );
    foreach ($users as $u) {
        Database::execute("UPDATE workspace_users SET status = 'suspended' WHERE id = :id", [':id' => $u['id']]);
        // Don't touch Google Workspace during auto-suspend — just mark in DB
        // GoogleWorkspaceService::suspendUser($u['email']); // enable when live
        $suspended++;
    }

    Database::execute('UPDATE billing_entities SET auto_suspend = 1 WHERE id = :id', [':id' => $be['id']]);
    Logger::info("[Cron] Auto-suspended {$be['name']} — renewal overdue since {$be['renewal_date']}");
}

Logger::info("[Cron] renewal-reminders complete — reminded: $reminded, suspended: $suspended");

if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json');
    echo json_encode(['reminded' => $reminded, 'suspended' => $suspended, 'date' => $today]);
}
