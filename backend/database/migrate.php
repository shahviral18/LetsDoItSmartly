<?php
// One-time migration runner — DELETE this file after running
// Access: https://mails.letsdoitsmartly.com/migrate.php?secret=LdisMigrate2026

define('SECRET', 'LdisMigrate2026');
if (($_GET['secret'] ?? '') !== SECRET) { http_response_code(403); die('Forbidden'); }

$host = 'localhost';
$db   = 'mailsldi_ldis';
$user = 'mailsldi_ldisuser';
$pass = 'Ldis@TechnoDoc2026!';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (Exception $e) {
    die('DB connection failed: ' . $e->getMessage());
}

$sql = file_get_contents(__DIR__ . '/schema.sql');

// Split on semicolons but skip empty statements
$statements = array_filter(
    array_map('trim', explode(';', $sql)),
    fn($s) => $s !== ''
);

$ok = 0; $errors = [];
foreach ($statements as $stmt) {
    try {
        $pdo->exec($stmt);
        $ok++;
    } catch (Exception $e) {
        $errors[] = htmlspecialchars($e->getMessage()) . '<br><pre>' . htmlspecialchars(substr($stmt, 0, 200)) . '</pre>';
    }
}

echo "<h2>Migration complete</h2>";
echo "<p>✅ $ok statements executed successfully.</p>";
if ($errors) {
    echo "<p>⚠️ " . count($errors) . " error(s):</p><ul>";
    foreach ($errors as $err) echo "<li>$err</li>";
    echo "</ul>";
}
echo "<p><strong>Delete this file from the server now.</strong></p>";
