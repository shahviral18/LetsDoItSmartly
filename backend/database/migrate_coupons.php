<?php
declare(strict_types=1);
define('BASE_PATH', dirname(__DIR__));
require BASE_PATH . '/helpers/Logger.php';
require BASE_PATH . '/config/env.php';
require BASE_PATH . '/config/database.php';

$pdo = Database::getConnection();

$pdo->exec("
CREATE TABLE IF NOT EXISTS coupons (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(50) NOT NULL UNIQUE,
    type        ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
    value       DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_uses    INT UNSIGNED NULL,
    uses_count  INT UNSIGNED NOT NULL DEFAULT 0,
    expires_at  DATE NULL,
    active      TINYINT(1) NOT NULL DEFAULT 1,
    deleted     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

echo "coupons table created OK\n";
