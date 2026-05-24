<?php
/**
 * Hard-Delete Cron — run daily via cPanel Cron Jobs
 * URL: https://mails.letsdoitsmartly.com/api/cron/run-hard-delete
 * OR direct: php /path/to/cron/hard-delete.php
 *
 * Logic:
 *   - Find workspace_users with status = 'deleted_pending'
 *     where deletion_requested_at <= 30 days ago
 *   - Hard delete from Google Admin
 *   - Mark status = 'deleted' + deleted_at = NOW() in DB
 */
declare(strict_types=1);

define('BASE_PATH', dirname(__DIR__));
require BASE_PATH . '/helpers/Logger.php';
require BASE_PATH . '/config/env.php';
require BASE_PATH . '/config/database.php';
require BASE_PATH . '/services/GoogleWorkspaceService.php';

if (php_sapi_name() !== 'cli') {
    $token = $_GET['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) {
        http_response_code(403);
        die(json_encode(['error' => 'Forbidden']));
    }
}

$cutoff   = date('Y-m-d H:i:s', strtotime('-30 days'));
$deleted  = 0;
$errors   = [];

$users = Database::query(
    "SELECT id, email, billing_entity_id, plan_slug
     FROM workspace_users
     WHERE status = 'deleted_pending' AND deletion_requested_at <= :cutoff",
    [':cutoff' => $cutoff]
);

foreach ($users as $u) {
    try {
        // Hard delete from Google Admin
        GoogleWorkspaceService::deleteUser($u['email']);

        Database::execute(
            "UPDATE workspace_users SET status = 'deleted', deleted_at = NOW() WHERE id = :id",
            [':id' => $u['id']]
        );

        Logger::info("[HardDelete] Permanently deleted {$u['email']}");
        $deleted++;
    } catch (Throwable $e) {
        Logger::error("[HardDelete] Failed to delete {$u['email']}: " . $e->getMessage());
        $errors[] = ['email' => $u['email'], 'error' => $e->getMessage()];
    }
}

Logger::info("[HardDelete] Complete — deleted: $deleted, errors: " . count($errors));

if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json');
    echo json_encode(['deleted' => $deleted, 'errors' => $errors]);
}
