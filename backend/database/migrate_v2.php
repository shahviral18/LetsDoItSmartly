<?php
/**
 * Migration v2 — Delete user flow (OTP + 30-day recovery)
 * Run once: GET https://mails.letsdoitsmartly.com/api/cron/run-migration-v2?token=LdisCron@TechnoDoc2026
 */
declare(strict_types=1);
define('BASE_PATH', dirname(__DIR__));
require BASE_PATH . '/config/env.php';
require BASE_PATH . '/config/database.php';

$token = $_GET['token'] ?? '';
if ($token !== INTERNAL_CRON_TOKEN) { http_response_code(403); die('Forbidden'); }

$statements = [
    // 1. Add deleted_pending to workspace_users status ENUM
    "ALTER TABLE workspace_users MODIFY COLUMN status ENUM('active','suspended','pending','deleted_pending','deleted') NOT NULL DEFAULT 'pending'",

    // 2. Add deletion tracking columns to workspace_users
    "ALTER TABLE workspace_users
       ADD COLUMN deletion_requested_at  DATETIME     DEFAULT NULL AFTER updated_at,
       ADD COLUMN deletion_otp           VARCHAR(6)   DEFAULT NULL AFTER deletion_requested_at,
       ADD COLUMN deletion_otp_expires_at DATETIME    DEFAULT NULL AFTER deletion_otp,
       ADD COLUMN deletion_confirmed_by  INT UNSIGNED DEFAULT NULL AFTER deletion_otp_expires_at,
       ADD COLUMN deleted_at             DATETIME     DEFAULT NULL AFTER deletion_confirmed_by",

    // 3. Add deletion approver emails to billing_entities
    "ALTER TABLE billing_entities
       ADD COLUMN deletion_approver_emails VARCHAR(500) DEFAULT NULL AFTER welcome_email_body",
];

$done = 0;
$errors = [];
foreach ($statements as $sql) {
    try {
        Database::execute($sql, []);
        $done++;
    } catch (PDOException $e) {
        // 1060 = duplicate column, 1005 = already exists — safe to skip
        if (in_array($e->getCode(), ['42S21', '1060', 'HY000'])) {
            $errors[] = ['skipped' => substr($sql, 0, 60), 'reason' => $e->getMessage()];
        } else {
            $errors[] = ['failed' => substr($sql, 0, 60), 'error' => $e->getMessage()];
        }
    }
}

header('Content-Type: application/json');
echo json_encode(['done' => $done, 'errors' => $errors, 'total' => count($statements)]);
