<?php
/**
 * Shared Drives Sync Cron — run daily via cPanel Cron Jobs
 * Recommended schedule: 0 2 * * * (2 AM daily)
 *
 * HTTP: GET https://mails.letsdoitsmartly.com/api/cron/sync-shared-drives?token={INTERNAL_CRON_TOKEN}
 * CLI:  php /path/to/cron/sync-shared-drives.php
 *
 * Logic:
 *   - Fetches all shared drives from Google Drive API (admin-level)
 *   - For each drive, fetches members (permissions)
 *   - Upserts everything into shared_drives table
 *   - Page load reads from DB — no live API calls
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

Logger::info('[SyncSharedDrives] Starting sync...');

try {
    $stats = GoogleWorkspaceService::syncSharedDrivesToDb();
    Logger::info("[SyncSharedDrives] Done — synced: {$stats['synced']}, errors: {$stats['errors']}, duration: {$stats['duration_sec']}s");
} catch (Throwable $e) {
    Logger::error('[SyncSharedDrives] Fatal: ' . $e->getMessage());
    $stats = ['synced' => 0, 'errors' => 1, 'duration_sec' => 0, 'error' => $e->getMessage()];
}

if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json');
    echo json_encode($stats);
}
