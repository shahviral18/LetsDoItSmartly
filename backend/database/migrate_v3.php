<?php
/**
 * Migration v3 — Phase 2.8: User Management Enhancements
 * Adds generic OTP columns to workspace_users for suspend + 2SV backup code actions.
 * Run once: GET https://mails.letsdoitsmartly.com/api/cron/run-migration-v3?token=LdisCron@TechnoDoc2026
 */
declare(strict_types=1);
// BASE_PATH, Database, INTERNAL_CRON_TOKEN already loaded by index.php when called via route.
// Standalone execution guard for direct file access (should not happen in production).

$statements = [
    "ALTER TABLE workspace_users
       ADD COLUMN action_otp           VARCHAR(10)  DEFAULT NULL AFTER deletion_otp_expires_at,
       ADD COLUMN action_otp_expires_at DATETIME    DEFAULT NULL AFTER action_otp,
       ADD COLUMN pending_action        VARCHAR(50) DEFAULT NULL AFTER action_otp_expires_at",
];

$done = 0;
$errors = [];
foreach ($statements as $sql) {
    try {
        Database::execute($sql, []);
        $done++;
    } catch (PDOException $e) {
        if (in_array($e->getCode(), ['42S21', '1060', 'HY000'])) {
            $errors[] = ['skipped' => substr($sql, 0, 80), 'reason' => $e->getMessage()];
        } else {
            $errors[] = ['failed' => substr($sql, 0, 80), 'error' => $e->getMessage()];
        }
    }
}

header('Content-Type: application/json');
echo json_encode(['done' => $done, 'errors' => $errors, 'total' => count($statements)]);
