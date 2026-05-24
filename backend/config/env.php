<?php
declare(strict_types=1);

// Load .env file if present (dev / staging)
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val);
        if (strlen($val) >= 2 && in_array($val[0], ['"', "'"], true) && $val[0] === $val[-1]) {
            $val = substr($val, 1, -1);
        }
        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key] = $val;
            putenv("$key=$val");
        }
    }
}

function env(string $key, mixed $default = null): mixed
{
    $val = $_ENV[$key] ?? getenv($key);
    return ($val !== false && $val !== null && $val !== '') ? $val : $default;
}

// ── Application ───────────────────────────────────────────────────────────────
define('APP_ENV',         env('APP_ENV', 'production'));
define('ALLOWED_ORIGINS', env('ALLOWED_ORIGINS', 'https://mails.letsdoitsmartly.com'));
define('SITE_URL',        env('SITE_URL', 'https://mails.letsdoitsmartly.com'));

// ── Database ──────────────────────────────────────────────────────────────────
define('DB_HOST',    env('DB_HOST', 'localhost'));
define('DB_NAME',    env('DB_NAME', 'mailsldi_ldis'));
define('DB_USER',    env('DB_USER', 'mailsldi_ldisuser'));
define('DB_PASS',    env('DB_PASS', ''));
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));

// ── JWT ───────────────────────────────────────────────────────────────────────
define('JWT_SECRET', env('JWT_SECRET', 'default_secret'));
define('JWT_EXPIRY', (int) env('JWT_EXPIRY', 86400 * 7));

// ── Zoho Payments (same account as WMD) ──────────────────────────────────────
define('ZOHO_PAYMENTS_ACCOUNT_ID',     env('ZOHO_PAYMENTS_ACCOUNT_ID',     '60035396803'));
define('ZOHO_PAYMENTS_SIGNING_KEY',    env('ZOHO_PAYMENTS_SIGNING_KEY',    ''));
define('ZOHO_PAYMENTS_WEBHOOK_SECRET', env('ZOHO_PAYMENTS_WEBHOOK_SECRET', ''));
define('ZOHO_OAUTH_CLIENT_ID',         env('ZOHO_OAUTH_CLIENT_ID',         '1000.0XGGBEHRRV8OEQL6XOCX6GGQZFL1PW'));
define('ZOHO_OAUTH_CLIENT_SECRET',     env('ZOHO_OAUTH_CLIENT_SECRET',     '5272e02f141e6f13d180e266ac4081216a47cdacc6'));
define('ZOHO_OAUTH_REFRESH_TOKEN',     env('ZOHO_OAUTH_REFRESH_TOKEN',     '1000.9ae9c9d4de88f98eb60fb2aa547cc453.8aa99cec1697326ed481c60a856dbfaa'));

// ── Zoho Books (same account as WMD) ─────────────────────────────────────────
define('ZOHO_BOOKS_ORG_ID',        env('ZOHO_BOOKS_ORG_ID',        '60034597554'));
define('ZOHO_BOOKS_CLIENT_ID',     env('ZOHO_BOOKS_CLIENT_ID',     '1000.0XGGBEHRRV8OEQL6XOCX6GGQZFL1PW'));
define('ZOHO_BOOKS_CLIENT_SECRET', env('ZOHO_BOOKS_CLIENT_SECRET', '5272e02f141e6f13d180e266ac4081216a47cdacc6'));
define('ZOHO_BOOKS_REFRESH_TOKEN', env('ZOHO_BOOKS_REFRESH_TOKEN', '1000.961decb2db051bb99b629e3eb57edcca.a5fa83fcbc42129d9769d82a83686b5f'));
define('ZOHO_BOOKS_INVOICE_PREFIX', env('ZOHO_BOOKS_INVOICE_PREFIX', 'LDIS'));

// ── Google Workspace ──────────────────────────────────────────────────────────
// Credentials live OUTSIDE public_html — same service account as WMD
define('GOOGLE_API_BASE',       env('GOOGLE_API_BASE',       '/home1/wmdadmin/google_api'));
define('GOOGLE_CREDENTIALS',    env('GOOGLE_CREDENTIALS',    '/home1/wmdadmin/google_api/credentials.json'));
define('GOOGLE_ADMIN_EMAIL',    env('GOOGLE_ADMIN_EMAIL',    'admin@webmydrive.com'));

// ── Internal / Cron ───────────────────────────────────────────────────────────
define('INTERNAL_CRON_TOKEN', env('INTERNAL_CRON_TOKEN', ''));

// ── Logging ───────────────────────────────────────────────────────────────────
define('LOG_DIR', env('LOG_DIR', __DIR__ . '/../logs'));
