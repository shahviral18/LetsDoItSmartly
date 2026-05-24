<?php
declare(strict_types=1);

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            // Priority: secure config file (production) > env constants (dev)
            $secureConfig = '/home1/mailsldi/secure_config/db_config.php';
            if (file_exists($secureConfig)) {
                require $secureConfig;
                // defines: $db_host, $db_name, $db_user, $db_pass
            } else {
                $db_host = DB_HOST;
                $db_name = DB_NAME;
                $db_user = DB_USER;
                $db_pass = DB_PASS;
            }

            if (empty($db_name) || empty($db_user)) {
                throw new RuntimeException('Database credentials not configured.');
            }

            $dsn = "mysql:host=$db_host;dbname=$db_name;charset=" . (defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4');
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_PERSISTENT         => true,
            ];
            $attempts = 0;
            while (true) {
                try {
                    self::$instance = new PDO($dsn, $db_user, $db_pass, $options);
                    break;
                } catch (\PDOException $e) {
                    if ($attempts < 1 && strpos($e->getMessage(), 'Too many connections') !== false) {
                        $attempts++;
                        usleep(500000);
                        continue;
                    }
                    throw $e;
                }
            }
        }
        return self::$instance;
    }

    public static function query(string $sql, array $params = []): array
    {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function queryOne(string $sql, array $params = []): ?array
    {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row !== false ? $row : null;
    }

    public static function execute(string $sql, array $params = []): int
    {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function insert(string $sql, array $params = []): int
    {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return (int) self::getConnection()->lastInsertId();
    }

    public static function beginTransaction(): void { self::getConnection()->beginTransaction(); }
    public static function commit(): void           { self::getConnection()->commit(); }
    public static function rollback(): void
    {
        if (self::getConnection()->inTransaction()) self::getConnection()->rollBack();
    }

    public static function count(string $table, string $where = '1=1', array $params = []): int
    {
        $row = self::queryOne("SELECT COUNT(*) AS cnt FROM $table WHERE $where", $params);
        return (int) ($row['cnt'] ?? 0);
    }

    public static function scalar(string $sql, array $params = []): mixed
    {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        $val = $stmt->fetchColumn();
        return $val !== false ? $val : null;
    }
}
