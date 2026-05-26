<?php
declare(strict_types=1);

// CORS preflight — bootstrap minimal set before full load
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    define('BASE_PATH', dirname(__DIR__));
    require BASE_PATH . '/helpers/Logger.php';
    require BASE_PATH . '/config/env.php';
    require BASE_PATH . '/helpers/Response.php';
    Response::handleOptions();
}

define('BASE_PATH', dirname(__DIR__));

// ── Core ──────────────────────────────────────────────────────────────────────
require BASE_PATH . '/helpers/Logger.php';
require BASE_PATH . '/config/env.php';
require BASE_PATH . '/config/database.php';
require BASE_PATH . '/helpers/JwtHelper.php';
require BASE_PATH . '/helpers/Request.php';
require BASE_PATH . '/helpers/Response.php';
require BASE_PATH . '/helpers/Router.php';

// ── Services ──────────────────────────────────────────────────────────────────
require BASE_PATH . '/services/AuditService.php';
require BASE_PATH . '/services/GoogleWorkspaceService.php';
require BASE_PATH . '/services/ZohoPaymentService.php';
require BASE_PATH . '/services/ZohoBooksService.php';

// ── Middleware ────────────────────────────────────────────────────────────────
require BASE_PATH . '/middleware/AuthMiddleware.php';
require BASE_PATH . '/middleware/RateLimiter.php';

// ── Controllers ───────────────────────────────────────────────────────────────
require BASE_PATH . '/controllers/AuthController.php';
require BASE_PATH . '/controllers/StaffController.php';
require BASE_PATH . '/controllers/BillingEntityController.php';
require BASE_PATH . '/controllers/DomainController.php';
require BASE_PATH . '/controllers/LicenseController.php';
require BASE_PATH . '/controllers/WorkspaceUserController.php';
require BASE_PATH . '/controllers/InvoiceController.php';
require BASE_PATH . '/controllers/PaymentController.php';
require BASE_PATH . '/controllers/DistributorController.php';
require BASE_PATH . '/controllers/BccController.php';
require BASE_PATH . '/controllers/SyncController.php';
require BASE_PATH . '/controllers/PortalUserController.php';

// ── Global error handler ──────────────────────────────────────────────────────
set_exception_handler(function (Throwable $e) {
    Logger::error('[Unhandled] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'Internal Server Error']);
    exit;
});

$request = new Request();
$router  = new Router($request);

// ── Middleware shorthands ─────────────────────────────────────────────────────
$auth        = [[AuthMiddleware::class, 'authenticate']];
$staffAuth   = AuthMiddleware::staffOnly();
$superAdmin  = AuthMiddleware::superAdminOnly();
$domainOwner = [...$auth, AuthMiddleware::authorize(['domain_owner'])];

// ── Health ────────────────────────────────────────────────────────────────────
$router->get('/api/health', function (Request $req) {
    Response::json(['status' => 'ok', 'app' => 'LetsDoItSmartly', 'env' => APP_ENV, 'time' => date('c')]);
});

// ── Dashboard stats ───────────────────────────────────────────────────────────
$router->get('/api/dashboard/stats', function (Request $req) {
    $role = $req->user['role'];

    // For domain owners, scope all stats to their billing entity
    $beId = null;
    if ($role === 'domain_owner') {
        $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
        $beId = $pu['billing_entity_id'] ?? null;
    }

    $beFilter  = $beId ? 'AND wu.billing_entity_id = :be' : '';
    $beParams  = $beId ? [':be' => $beId] : [];
    $dFilter   = $beId ? 'AND d.billing_entity_id = :be' : '';
    $invFilter = $beId ? 'AND billing_entity_id = :be' : '';

    $totalUsers   = (int) Database::queryOne("SELECT COUNT(*) AS n FROM workspace_users wu WHERE status != 'deleted' $beFilter", $beParams)['n'];
    $activeUsers  = (int) Database::queryOne("SELECT COUNT(*) AS n FROM workspace_users wu WHERE status = 'active' $beFilter", $beParams)['n'];
    $totalDomains = (int) Database::queryOne("SELECT COUNT(*) AS n FROM domains d WHERE is_active = 1 $dFilter", $beParams)['n'];
    $no2sv        = (int) Database::queryOne("SELECT COUNT(*) AS n FROM workspace_users wu WHERE two_sv_enabled = 0 AND status = 'active' $beFilter", $beParams)['n'];

    // Staff-only: billing-wide totals
    $totalBe    = $beId ? 1 : (int) Database::queryOne('SELECT COUNT(*) AS n FROM billing_entities', [])['n'];
    $pendingInv = (int) Database::queryOne("SELECT COUNT(*) AS n FROM invoices WHERE status = 'pending' $invFilter", $beParams)['n'];
    $totalRev   = (float) (Database::queryOne("SELECT COALESCE(SUM(total_amount),0) AS s FROM invoices WHERE status = 'paid' $invFilter", $beParams)['s'] ?? 0);

    // License pools
    $poolWhere = $beId ? 'WHERE lp.billing_entity_id = :be' : '';
    $pools = Database::query(
        "SELECT be.name, be.slug, lp.plan_slug, lp.allocated, lp.used
         FROM license_pool lp JOIN billing_entities be ON be.id = lp.billing_entity_id
         $poolWhere ORDER BY be.name, lp.plan_slug",
        $beParams
    );
    $poolMap = [];
    foreach ($pools as $p) {
        $k = $p['slug'];
        if (!isset($poolMap[$k])) $poolMap[$k] = ['name' => $p['name'], 'slug' => $k, 'plans' => []];
        $poolMap[$k]['plans'][] = ['slug' => $p['plan_slug'], 'allocated' => (int)$p['allocated'], 'used' => (int)$p['used']];
    }

    $storageRow = Database::queryOne(
        "SELECT COALESCE(SUM(wu.storage_used_mb),0) AS mb, COUNT(*) AS n
         FROM workspace_users wu WHERE wu.status = 'active' $beFilter",
        $beParams
    );

    Response::json([
        'totalUsers' => $totalUsers, 'activeUsers' => $activeUsers,
        'totalDomains' => $totalDomains, 'totalBillingEntities' => $totalBe,
        'pendingInvoices' => $pendingInv, 'totalRevenue' => $totalRev,
        'unresolved2svUsers' => $no2sv,
        'totalStorageMb' => (int)($storageRow['mb'] ?? 0),
        'totalStorageUsers' => (int)($storageRow['n'] ?? 0),
        'licensePools' => array_values($poolMap),
    ]);
}, $auth);

// ── Domain stats (with user/storage aggregates) ───────────────────────────────
$router->get('/api/domains/stats', function (Request $req) {
    $rows = Database::query(
        'SELECT d.id, d.name, d.ou_path, d.is_active, be.name AS billing_entity_name, be.id AS billing_entity_id,
                COUNT(wu.id) AS user_count,
                SUM(wu.two_sv_enabled) AS two_sv_count,
                COALESCE(SUM(wu.storage_used_mb),0) AS storage_used_mb,
                COALESCE(SUM(wu.storage_total_mb),0) AS storage_total_mb
         FROM domains d
         JOIN billing_entities be ON be.id = d.billing_entity_id
         LEFT JOIN workspace_users wu ON wu.domain_id = d.id AND wu.status != "deleted"
         WHERE d.is_active = 1
         GROUP BY d.id
         ORDER BY d.name',
        []
    );
    Response::json(['data' => $rows]);
}, $staffAuth);

// ── Auth ──────────────────────────────────────────────────────────────────────
$router->post('/api/auth/login',           [AuthController::class, 'login'],          [RateLimiter::limit('LOGIN_ATTEMPT', 10, 900)]);
$router->get ('/api/auth/me',              [AuthController::class, 'me'],             $auth);
$router->post('/api/auth/logout',          [AuthController::class, 'logout'],         $auth);
$router->post('/api/auth/forgot-password', [AuthController::class, 'forgotPassword'], [RateLimiter::limit('FORGOT_PASSWORD', 3, 900)]);
$router->post('/api/auth/reset-password',  [AuthController::class, 'resetPassword']);
$router->post('/api/auth/change-password', [AuthController::class, 'changePassword'], $auth);

// ── Staff Management (super_admin only) ───────────────────────────────────────
$router->get   ('/api/staff',        [StaffController::class, 'list'],   $superAdmin);
$router->post  ('/api/staff',        [StaffController::class, 'create'], $superAdmin);
$router->patch ('/api/staff/:id',    [StaffController::class, 'update'], $superAdmin);
$router->delete('/api/staff/:id',    [StaffController::class, 'delete'], $superAdmin);

// ── Billing Entities ──────────────────────────────────────────────────────────
$router->get  ('/api/billing-entities',      [BillingEntityController::class, 'list'],   $staffAuth);
$router->post ('/api/billing-entities',      [BillingEntityController::class, 'create'], AuthMiddleware::staffOnly(['super_admin','admin']));
$router->get  ('/api/billing-entities/:id',  [BillingEntityController::class, 'get'],    $staffAuth);
$router->patch('/api/billing-entities/:id',  [BillingEntityController::class, 'update'], AuthMiddleware::staffOnly(['super_admin','admin']));

// ── Domains ───────────────────────────────────────────────────────────────────
$router->get  ('/api/domains',              [DomainController::class, 'list'],   $auth);  // staff=all, domain_owner=scoped
$router->post ('/api/domains',              [DomainController::class, 'create'], AuthMiddleware::staffOnly(['super_admin','admin']));
$router->get  ('/api/domains/:id',          [DomainController::class, 'get'],    $staffAuth);
$router->patch('/api/domains/:id',          [DomainController::class, 'update'], AuthMiddleware::staffOnly(['super_admin','admin']));
// Domain owner: get their own domains
$router->get('/api/my/domains',             [DomainController::class, 'myDomains'], [...$auth, AuthMiddleware::authorize(['domain_owner'])]);

// ── License Pool ──────────────────────────────────────────────────────────────
$router->get ('/api/billing-entities/:id/license-pool', [LicenseController::class, 'getPool'],     $auth);
$router->post('/api/billing-entities/:id/buy-licenses', [LicenseController::class, 'initiateBuy'], $auth);

// ── Plans (public — needed for checkout page) ─────────────────────────────────
$router->get ('/api/plans',      [LicenseController::class, 'getPlans']);
$router->post('/api/plans/:id',  [LicenseController::class, 'updatePlan'], $superAdmin);

// ── Workspace Users ───────────────────────────────────────────────────────────
$router->get   ('/api/workspace-users',             [WorkspaceUserController::class, 'list'],       $auth);
$router->post  ('/api/workspace-users',             [WorkspaceUserController::class, 'create'],     $auth);
$router->get   ('/api/workspace-users/recoverable', [WorkspaceUserController::class, 'recoverable'], $auth);
$router->get   ('/api/workspace-users/:id',         [WorkspaceUserController::class, 'get'],        $auth);
$router->patch ('/api/workspace-users/:id',      [WorkspaceUserController::class, 'update'],  $auth);
// Action dispatcher — avoids ModSecurity blocking POST to sub-paths.
// Use: PATCH /api/workspace-users/:id/action  with body { "action": "suspend"|"unsuspend"|"reset-password"|"upgrade-plan"|"archive"|"archive-confirm"|"restore", ...params }
$router->patch('/api/workspace-users/:id/action', [WorkspaceUserController::class, 'dispatchAction'], $auth);

// ── Payments ──────────────────────────────────────────────────────────────────
$router->post('/api/payment/create-session', [PaymentController::class, 'createSession'], $auth);
$router->get ('/api/payment/status',         [PaymentController::class, 'getStatus'],     $auth);
$router->post('/api/webhook/zoho-payment',   [PaymentController::class, 'zohoWebhook']);

// ── Invoices ──────────────────────────────────────────────────────────────────
$router->get('/api/invoices',     [InvoiceController::class, 'list'],   $auth);
$router->get('/api/invoices/:id', [InvoiceController::class, 'get'],    $auth);

// Staff: all invoices
$router->get('/api/admin/invoices', [InvoiceController::class, 'adminList'], $staffAuth);

// ── Security & Audit ──────────────────────────────────────────────────────────
$router->get('/api/audit-log',     function (Request $req) {
    // Auditor, admin, super_admin
    $allowed = ['super_admin', 'admin', 'auditor', 'support_admin'];
    if (!in_array($req->user['role'], $allowed, true)) Response::error('Forbidden', 403);
    $page  = (int) ($req->query['page'] ?? 1);
    $limit = min((int) ($req->query['limit'] ?? 50), 200);
    $offset = ($page - 1) * $limit;
    $logs = Database::query(
        'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT :lim OFFSET :off',
        [':lim' => $limit, ':off' => $offset]
    );
    Response::json(['data' => $logs]);
}, $auth);

// ── Distributor ───────────────────────────────────────────────────────────────
$router->get  ('/api/distributor/dashboard',      [DistributorController::class, 'dashboard'],     [...$auth, AuthMiddleware::authorize(['distributor'])]);
$router->get  ('/api/distributor/clients',        [DistributorController::class, 'clients'],       [...$auth, AuthMiddleware::authorize(['distributor'])]);
$router->get  ('/api/distributor/payouts',        [DistributorController::class, 'payouts'],       [...$auth, AuthMiddleware::authorize(['distributor'])]);
$router->post ('/api/distributor/request-payout', [DistributorController::class, 'requestPayout'], [...$auth, AuthMiddleware::authorize(['distributor'])]);
// Admin: manage distributors
$router->get  ('/api/admin/distributors',         [DistributorController::class, 'adminList'],     $staffAuth);
$router->patch('/api/admin/distributors/:id',     [DistributorController::class, 'adminUpdate'],   AuthMiddleware::staffOnly(['super_admin','admin']));
$router->patch('/api/admin/distributor-payouts/:id', [DistributorController::class, 'adminPayout'], AuthMiddleware::staffOnly(['super_admin','admin']));

// ── BCC / Email Surveillance ──────────────────────────────────────────────────
$router->get  ('/api/bcc-requests',        [BccController::class, 'list'],       $auth);
$router->post ('/api/bcc-requests',        [BccController::class, 'create'],     [...$auth, AuthMiddleware::authorize(['domain_owner'])]);
$router->get  ('/api/bcc-requests/:id',    [BccController::class, 'get'],        $auth);
$router->patch('/api/bcc-requests/:id',    [BccController::class, 'updateStatus'], AuthMiddleware::staffOnly(['super_admin','admin','support_admin']));

// ── Cron HTTP triggers (token-protected, no auth middleware) ─────────────────
$router->get('/api/scheduled/renewals', function (Request $req) {
    $token = $req->query['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) Response::error('Forbidden', 403);
    require BASE_PATH . '/cron/renewal-reminders.php';
});
$router->get('/api/scheduled/hard-delete', function (Request $req) {
    $token = $req->query['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) Response::error('Forbidden', 403);
    require BASE_PATH . '/cron/hard-delete.php';
});

// ── Google Sync (super_admin only) ───────────────────────────────────────────
$router->post('/api/admin/sync-google', [SyncController::class, 'syncGoogle'], $superAdmin);

// ── Portal Users (domain_owner accounts) ─────────────────────────────────────
$portalUserWrite = AuthMiddleware::staffOnly(['super_admin', 'admin']);
$portalUserRead  = AuthMiddleware::staffOnly(['super_admin', 'admin', 'support_admin']);
$router->get  ('/api/portal-users',                        [PortalUserController::class, 'list'],                $portalUserRead);
$router->post ('/api/portal-users',                        [PortalUserController::class, 'create'],              $portalUserWrite);
$router->get  ('/api/portal-users/:id',                    [PortalUserController::class, 'get'],                 $portalUserRead);
$router->patch('/api/portal-users/:id',                    [PortalUserController::class, 'update'],              $portalUserWrite);
$router->post ('/api/portal-users/:id/reset-password',     [PortalUserController::class, 'resetPassword'],       $portalUserWrite);
$router->patch('/api/portal-users/:id/assign-entity',      [PortalUserController::class, 'assignBillingEntity'], $portalUserWrite);

// ── Admin: config ─────────────────────────────────────────────────────────────
$router->get  ('/api/admin/config',       function (Request $req) {
    $config = Database::query('SELECT `key`, value FROM admin_config');
    $out = [];
    foreach ($config as $row) $out[$row['key']] = $row['value'];
    Response::json($out);
}, $superAdmin);

$router->post('/api/admin/config', function (Request $req) {
    $allowed = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_from_name',
                'license_price_per_user', 'trial_days', 'support_email', 'company_name'];
    foreach ($req->body as $key => $value) {
        if (!in_array($key, $allowed, true)) continue;
        Database::execute(
            'INSERT INTO admin_config (`key`, value, updated_by) VALUES (:k, :v, :by)
             ON DUPLICATE KEY UPDATE value = :v, updated_by = :by',
            [':k' => $key, ':v' => (string) $value, ':by' => $req->user['userId']]
        );
    }
    AuditService::log('CONFIG_UPDATED', 'staff', $req->user['userId'], '', $req->user['role'], '', json_encode($req->body), $req->ip);
    Response::json(['message' => 'Config updated.']);
}, $superAdmin);

// ── Security Alerts (derived from DB — 2SV disabled users) ───────────────────
$router->get('/api/security/alerts', function (Request $req) {
    $role = $req->user['role'];
    $beId = null;
    if ($role === 'domain_owner') {
        $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
        $beId = $pu['billing_entity_id'] ?? null;
    }
    $beFilter = $beId ? 'AND wu.billing_entity_id = :be' : '';
    $params   = $beId ? [':be' => $beId] : [];

    $rows = Database::query(
        "SELECT wu.id, CONCAT(wu.first_name,' ',wu.last_name) AS user_name,
                wu.email, d.name AS domain_name, wu.status,
                wu.two_sv_enabled, wu.last_login_at, wu.created_at,
                wu.storage_used_mb, wu.storage_total_mb, wu.created_via_portal
         FROM workspace_users wu
         JOIN domains d ON d.id = wu.domain_id
         WHERE wu.status != 'deleted' $beFilter
         ORDER BY wu.email LIMIT 500",
        $params
    );

    // Load all resolutions for quick lookup
    $resolutions = [];
    try {
        $ress = Database::query('SELECT alert_key, resolution_note, resolved_at FROM security_alert_resolutions');
        foreach ($ress as $res) $resolutions[$res['alert_key']] = $res;
    } catch (Throwable $e) { /* table may not exist yet */ }

    $alerts = [];
    foreach ($rows as $r) {
        $name  = $r['user_name'];
        $email = $r['email'];
        $dom   = $r['domain_name'];
        $ts    = $r['created_at'];

        // Never logged in (active, created > 7 days ago) → High
        if ($r['status'] === 'active' && !$r['last_login_at']) {
            $age = (int) floor((time() - strtotime($r['created_at'])) / 86400);
            if ($age >= 7) {
                $aid = 'never_'.$r['id'];
                $res = $resolutions[$aid] ?? null;
                $alerts[] = ['id'=>$aid,'user_name'=>$name,'email'=>$email,'domain'=>$dom,
                    'type'=>'never_logged_in','severity'=>'high',
                    'message'=>"Account active {$age} days, never logged in",
                    'resolved'=>(bool)$res,'resolution_note'=>$res['resolution_note']??null,'resolved_at'=>$res['resolved_at']??null,
                    'timestamp'=>$ts];
            }
        }

        // Storage critical ≥90% → High
        if ((int)$r['storage_total_mb'] > 0) {
            $pct = round((int)$r['storage_used_mb'] / (int)$r['storage_total_mb'] * 100);
            if ($pct >= 90) {
                $aid = 'stcrit_'.$r['id'];
                $res = $resolutions[$aid] ?? null;
                $alerts[] = ['id'=>$aid,'user_name'=>$name,'email'=>$email,'domain'=>$dom,
                    'type'=>'storage_critical','severity'=>'high',
                    'message'=>"Storage {$pct}% full",
                    'resolved'=>(bool)$res,'resolution_note'=>$res['resolution_note']??null,'resolved_at'=>$res['resolved_at']??null,
                    'timestamp'=>$ts];
            } elseif ($pct >= 75) {
                $aid = 'stwarn_'.$r['id'];
                $res = $resolutions[$aid] ?? null;
                $alerts[] = ['id'=>$aid,'user_name'=>$name,'email'=>$email,'domain'=>$dom,
                    'type'=>'storage_warning','severity'=>'medium',
                    'message'=>"Storage {$pct}% used",
                    'resolved'=>(bool)$res,'resolution_note'=>$res['resolution_note']??null,'resolved_at'=>$res['resolved_at']??null,
                    'timestamp'=>$ts];
            }
        }

        // 2SV disabled on active accounts → Medium
        if ($r['status'] === 'active' && !(int)$r['two_sv_enabled']) {
            $aid = '2sv_'.$r['id'];
            $res = $resolutions[$aid] ?? null;
            $alerts[] = ['id'=>$aid,'user_name'=>$name,'email'=>$email,'domain'=>$dom,
                'type'=>'2sv_disabled','severity'=>'medium',
                'message'=>'2-Step Verification is disabled',
                'resolved'=>(bool)$res,'resolution_note'=>$res['resolution_note']??null,'resolved_at'=>$res['resolved_at']??null,
                'timestamp'=>$ts];
        }

        // Suspended accounts → High
        if ($r['status'] === 'suspended') {
            $aid = 'susp_'.$r['id'];
            $res = $resolutions[$aid] ?? null;
            $alerts[] = ['id'=>$aid,'user_name'=>$name,'email'=>$email,'domain'=>$dom,
                'type'=>'account_suspended','severity'=>'high',
                'message'=>'Account is suspended',
                'resolved'=>(bool)$res,'resolution_note'=>$res['resolution_note']??null,'resolved_at'=>$res['resolved_at']??null,
                'timestamp'=>$ts];
        }

        // No login in 60+ days → Low
        if ($r['last_login_at'] && $r['status'] === 'active') {
            $days = (int) floor((time() - strtotime($r['last_login_at'])) / 86400);
            if ($days >= 60) {
                $aid = 'stale_'.$r['id'];
                $res = $resolutions[$aid] ?? null;
                $alerts[] = ['id'=>$aid,'user_name'=>$name,'email'=>$email,'domain'=>$dom,
                    'type'=>'stale_account','severity'=>'low',
                    'message'=>"No login in {$days} days",
                    'resolved'=>(bool)$res,'resolution_note'=>$res['resolution_note']??null,'resolved_at'=>$res['resolved_at']??null,
                    'timestamp'=>$r['last_login_at']];
            }
        }

        // Pending portal account (created via portal, never activated) → Low
        if ((int)$r['created_via_portal'] && $r['status'] === 'pending') {
            $aid = 'pend_'.$r['id'];
            $res = $resolutions[$aid] ?? null;
            $alerts[] = ['id'=>$aid,'user_name'=>$name,'email'=>$email,'domain'=>$dom,
                'type'=>'new_unverified','severity'=>'low',
                'message'=>'Account pending activation',
                'resolved'=>(bool)$res,'resolution_note'=>$res['resolution_note']??null,'resolved_at'=>$res['resolved_at']??null,
                'timestamp'=>$ts];
        }
    }

    // Sort: high → medium → low
    $order = ['high' => 0, 'medium' => 1, 'low' => 2];
    usort($alerts, fn($a, $b) => $order[$a['severity']] <=> $order[$b['severity']]);

    Response::json(['data' => $alerts]);
}, $auth);

// ── Security Alert Resolve ────────────────────────────────────────────────────
$router->patch('/api/security/alerts/:id/resolve', function (Request $req) {
    $alertId = $req->params['id'] ?? '';
    $note    = trim($req->body['note'] ?? '');
    if (!$alertId) Response::error('Alert ID required', 400);
    if (!$note)    Response::error('Resolution note required', 400);

    // Ensure table exists
    Database::execute("CREATE TABLE IF NOT EXISTS security_alert_resolutions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alert_key VARCHAR(64) NOT NULL,
        resolved_by INT NOT NULL,
        resolution_note TEXT NOT NULL,
        resolved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_alert_key (alert_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    Database::execute(
        'INSERT INTO security_alert_resolutions (alert_key, resolved_by, resolution_note)
         VALUES (:key, :by, :note)
         ON DUPLICATE KEY UPDATE resolved_by = :by, resolution_note = :note, resolved_at = NOW()',
        [':key' => $alertId, ':by' => $req->user['userId'], ':note' => $note]
    );
    AuditService::log('ALERT_RESOLVED', 'staff', $req->user['userId'], '', $req->user['role'], '', "Alert $alertId resolved: $note", $req->ip);
    Response::json(['message' => 'Alert marked as resolved.']);
}, $auth);

// ── Shared Drives ─────────────────────────────────────────────────────────────
$router->get('/api/shared-drives', function (Request $req) {
    // Ensure table exists and has latest columns
    Database::execute("CREATE TABLE IF NOT EXISTS shared_drives (
        id             VARCHAR(64)  NOT NULL PRIMARY KEY,
        name           VARCHAR(255) NOT NULL,
        creator_email  VARCHAR(255) DEFAULT NULL,
        domain         VARCHAR(255) DEFAULT NULL,
        member_count   INT UNSIGNED NOT NULL DEFAULT 0,
        members_json   MEDIUMTEXT   DEFAULT NULL,
        storage_mb     BIGINT UNSIGNED NOT NULL DEFAULT 0,
        created_at     DATETIME     DEFAULT NULL,
        last_synced_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4", []);
    try { Database::execute("ALTER TABLE shared_drives ADD COLUMN storage_mb BIGINT UNSIGNED NOT NULL DEFAULT 0", []); } catch (Throwable $e) { /* already exists */ }

    $role = $req->user['role'] ?? '';
    if ($role === 'domain_owner') {
        // Scope to domains belonging to this user's billing entity
        $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
        $beId = $pu['billing_entity_id'] ?? null;
        if (!$beId) { Response::json(['data' => [], 'last_synced_at' => null]); return; }
        $domainRows = Database::query('SELECT name FROM domains WHERE billing_entity_id = :be AND is_active = 1', [':be' => $beId]);
        $domainNames = array_column($domainRows, 'name');
        if (empty($domainNames)) { Response::json(['data' => [], 'last_synced_at' => null]); return; }
        $placeholders = implode(',', array_fill(0, count($domainNames), '?'));
        $drives = Database::query("SELECT id, name, creator_email, domain, member_count, storage_mb, created_at, last_synced_at FROM shared_drives WHERE domain IN ($placeholders) ORDER BY name", $domainNames);
    } else {
        $drives = Database::query('SELECT id, name, creator_email, domain, member_count, storage_mb, created_at, last_synced_at FROM shared_drives ORDER BY name');
    }
    $lastSynced = Database::queryOne('SELECT MAX(last_synced_at) AS ts FROM shared_drives');
    Response::json(['data' => $drives, 'last_synced_at' => $lastSynced['ts'] ?? null]);
}, $auth);



$router->get('/api/shared-drives/sync-status', function (Request $req) {
    GoogleWorkspaceService::ensureSyncJobTable();
    $row = Database::queryOne("SELECT * FROM sync_jobs WHERE job = 'shared_drives'");
    Response::json($row ?? ['status' => 'idle', 'total' => 0, 'done' => 0, 'errors' => 0]);
}, $superAdmin);

$router->get('/api/shared-drives/:driveId/members', function (Request $req) {
    $driveId = $req->params['driveId'] ?? '';
    if (!$driveId) Response::error('Drive ID required', 400);
    $row = Database::queryOne('SELECT members_json FROM shared_drives WHERE id = :id', [':id' => $driveId]);
    if (!$row) Response::error('Drive not found', 404);
    Response::json(['data' => json_decode($row['members_json'] ?? '[]', true) ?? []]);
}, $auth);

$router->post('/api/shared-drives/sync', function (Request $req) {
    set_time_limit(0);
    ini_set('memory_limit', '512M');
    ignore_user_abort(true);
    $stats = GoogleWorkspaceService::syncSharedDrivesToDb();
    Response::json($stats);
}, $superAdmin);

$router->get('/api/scheduled/drives-sync', function (Request $req) {
    $token = $req->query['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) Response::error('Forbidden', 403);
    set_time_limit(0);
    ini_set('memory_limit', '512M');
    ignore_user_abort(true);
    try {
        $stats = GoogleWorkspaceService::syncSharedDrivesToDb();
        Response::json($stats);
    } catch (Throwable $e) {
        GoogleWorkspaceService::updateSyncJob('shared_drives', 'failed', 0, 0, 0);
        Response::error('Sync failed: ' . $e->getMessage(), 500);
    }
});

$router->get('/api/scheduled/drives-members', function (Request $req) {
    $token = $req->query['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) Response::error('Forbidden', 403);
    set_time_limit(0);
    ini_set('memory_limit', '512M');
    ignore_user_abort(true);
    $forceAll = ($req->query['force'] ?? '') === '1';
    try {
        $stats = GoogleWorkspaceService::syncMembersToDb($forceAll);
        Response::json($stats);
    } catch (Throwable $e) {
        Response::error('Members sync failed: ' . $e->getMessage(), 500);
    }
});

// Storage sync removed — Google Drive API does not expose shared drive storage usage.
// The UI shows '—' when storage_mb = 0, which is the correct display.

// ── Profile ───────────────────────────────────────────────────────────────────
$router->get('/api/profile', function (Request $req) {
    $role = $req->user['role'];
    if ($role === 'domain_owner') {
        $u = Database::queryOne(
            'SELECT pu.id, pu.name, pu.email, pu.phone, pu.company_name, pu.gstin, pu.billing_address,
                    be.name AS billing_entity_name, be.id AS billing_entity_id
             FROM portal_users pu
             LEFT JOIN billing_entities be ON be.id = pu.billing_entity_id
             WHERE pu.id = :id',
            [':id' => $req->user['userId']]
        );
        if (!$u) Response::error('Not found', 404);
        // Split name → first_name / last_name for frontend compatibility
        $nameParts        = explode(' ', $u['name'] ?? '', 2);
        $u['first_name']  = $nameParts[0];
        $u['last_name']   = $nameParts[1] ?? '';
        // Load linked domains
        $domains = Database::query(
            'SELECT id, name FROM domains WHERE billing_entity_id = :be AND is_active = 1 ORDER BY name',
            [':be' => $u['billing_entity_id']]
        );
        $u['domains'] = $domains;
        Response::json($u);
    } else {
        $u = Database::queryOne('SELECT id, name, email, role FROM staff_users WHERE id = :id', [':id' => $req->user['userId']]);
        if (!$u) Response::error('Not found', 404);
        $nameParts = explode(' ', trim($u['name'] ?? ''), 2);
        $u['first_name'] = $nameParts[0] ?? '';
        $u['last_name']  = $nameParts[1] ?? '';
        Response::json($u);
    }
}, $auth);

$router->patch('/api/profile', function (Request $req) {
    $b = $req->body;
    $role = $req->user['role'];
    if ($role === 'domain_owner') {
        $fields = [];
        $params = [':id' => $req->user['userId']];
        // Accept first_name/last_name from frontend and combine into the name column
        if (isset($b['first_name']) || isset($b['last_name'])) {
            $existing  = Database::queryOne('SELECT name FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
            $parts     = explode(' ', $existing['name'] ?? '', 2);
            $first     = isset($b['first_name']) ? trim($b['first_name']) : ($parts[0] ?? '');
            $last      = isset($b['last_name'])  ? trim($b['last_name'])  : ($parts[1] ?? '');
            $fields[]  = 'name = :name';
            $params[':name'] = trim("$first $last");
        } elseif (isset($b['name'])) {
            $fields[] = 'name = :name'; $params[':name'] = trim($b['name']);
        }
        if (isset($b['phone']))           { $fields[] = 'phone = :phone';         $params[':phone']   = trim($b['phone']); }
        if (isset($b['company_name']))    { $fields[] = 'company_name = :co';     $params[':co']      = trim($b['company_name']); }
        if (isset($b['gstin']))           { $fields[] = 'gstin = :gstin';         $params[':gstin']   = trim($b['gstin']); }
        if (isset($b['billing_address'])) { $fields[] = 'billing_address = :ba';  $params[':ba']      = trim($b['billing_address']); }
        if (empty($fields)) Response::error('Nothing to update', 400);
        Database::execute('UPDATE portal_users SET ' . implode(', ', $fields) . ' WHERE id = :id', $params);
        Response::json(['message' => 'Profile updated.']);
    } else {
        // Accept first_name/last_name or combined name
        $newName = null;
        if (isset($b['first_name']) || isset($b['last_name'])) {
            $fn = trim($b['first_name'] ?? '');
            $ln = trim($b['last_name'] ?? '');
            $newName = trim("$fn $ln");
        } elseif (!empty($b['name'])) {
            $newName = trim($b['name']);
        }
        if ($newName) {
            Database::execute('UPDATE staff_users SET name = :n WHERE id = :id', [':n' => $newName, ':id' => $req->user['userId']]);
        }
        Response::json(['message' => 'Profile updated.']);
    }
}, $auth);

$router->patch('/api/profile/password', function (Request $req) {
    $b       = $req->body;
    $current = $b['current_password'] ?? '';
    $newPw   = $b['new_password'] ?? '';
    if (!$current || !$newPw) Response::error('Current and new password required', 400);
    if (strlen($newPw) < 8) Response::error('New password must be at least 8 characters', 400);

    $role = $req->user['role'];
    $table = ($role === 'domain_owner') ? 'portal_users' : 'staff_users';
    $u = Database::queryOne("SELECT password_hash FROM $table WHERE id = :id", [':id' => $req->user['userId']]);
    if (!$u || !password_verify($current, $u['password_hash'])) Response::error('Current password is incorrect', 400);

    $hash = password_hash($newPw, PASSWORD_BCRYPT);
    Database::execute("UPDATE $table SET password_hash = :h, password_reset_required = 0 WHERE id = :id",
        [':h' => $hash, ':id' => $req->user['userId']]);
    AuditService::log('PASSWORD_CHANGED', $role === 'domain_owner' ? 'portal' : 'staff', $req->user['userId'], '', $role, '', 'Password changed via profile', $req->ip);
    Response::json(['message' => 'Password changed successfully.']);
}, $auth);

// ── Google Login History ──────────────────────────────────────────────────────
$router->get('/api/google/users', function (Request $req) {
    $role = $req->user['role'];
    $beId = null;
    if ($role === 'domain_owner') {
        $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
        $beId = $pu['billing_entity_id'] ?? null;
    }
    $beFilter = $beId ? 'AND wu.billing_entity_id = :be' : '';
    $params   = $beId ? [':be' => $beId] : [];

    $users = Database::query(
        "SELECT wu.id, wu.first_name, wu.last_name, wu.email, wu.status,
                wu.two_sv_enabled, wu.last_login_at, wu.plan_slug, d.name AS domain_name
         FROM workspace_users wu
         JOIN domains d ON d.id = wu.domain_id
         WHERE wu.status != 'deleted' $beFilter
         ORDER BY wu.email LIMIT 500",
        $params
    );
    Response::json(['data' => $users]);
}, $auth);

$router->get('/api/google/login-history/:email', function (Request $req) {
    $email = urldecode($req->params['email'] ?? '');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Invalid email', 400);

    // Verify requester can access this user
    $role = $req->user['role'];
    $wu   = Database::queryOne(
        'SELECT wu.billing_entity_id FROM workspace_users wu WHERE wu.email = :e',
        [':e' => $email]
    );
    if (!$wu) Response::error('User not found', 404);

    if ($role === 'domain_owner') {
        $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
        if ($pu['billing_entity_id'] !== $wu['billing_entity_id']) Response::error('Forbidden', 403);
    }

    $history = GoogleWorkspaceService::getLoginHistory($email, 10);
    Response::json(['email' => $email, 'data' => $history]);
}, $auth);

$router->post('/api/google/sign-out/:email', function (Request $req) {
    $email = urldecode($req->params['email'] ?? '');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Invalid email', 400);

    // Verify requester can manage this user
    $role = $req->user['role'];
    $wu   = Database::queryOne(
        'SELECT wu.billing_entity_id FROM workspace_users wu WHERE wu.email = :e',
        [':e' => $email]
    );
    if (!$wu) Response::error('User not found', 404);

    if ($role === 'domain_owner') {
        $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
        if ($pu['billing_entity_id'] !== $wu['billing_entity_id']) Response::error('Forbidden', 403);
    }

    GoogleWorkspaceService::signOutUser($email);
    AuditService::log('GOOGLE_SIGN_OUT', $role === 'domain_owner' ? 'portal' : 'staff',
        $req->user['userId'], '', $role, $email, 'Force signed out from all devices', $req->ip);
    Response::json(['message' => "User $email signed out from all Google sessions."]);
}, $auth);

// ── Login History (from audit_log LOGIN entries) ───────────────────────────────
$router->get('/api/security/login-history', function (Request $req) {
    $role = $req->user['role'];
    $beId = null;
    if ($role === 'domain_owner') {
        $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
        $beId = $pu['billing_entity_id'] ?? null;
    }

    $page  = max(1, (int)($req->query['page'] ?? 1));
    $limit = min((int)($req->query['limit'] ?? 50), 200);
    $off   = ($page - 1) * $limit;

    if ($beId) {
        // Show user_sessions for workspace users under this billing entity
        $rows = Database::query(
            "SELECT us.user_id, us.user_type, us.ip_address, us.user_agent, us.created_at,
                    CONCAT(wu.first_name,' ',wu.last_name) AS actor_name, wu.email AS actor_email,
                    d.name AS domain_name
             FROM user_sessions us
             JOIN workspace_users wu ON wu.email = (
                SELECT email FROM portal_users WHERE id = us.user_id AND us.user_type = 'portal'
             )
             JOIN domains d ON d.id = wu.domain_id
             WHERE us.user_type = 'portal' AND wu.billing_entity_id = :be
             ORDER BY us.created_at DESC LIMIT :lim OFFSET :off",
            [':be' => $beId, ':lim' => $limit, ':off' => $off]
        );
        // fallback: just show portal user's own sessions
        if (empty($rows)) {
            $rows = Database::query(
                "SELECT us.*, pu.name AS actor_name, pu.email AS actor_email, '' AS domain_name
                 FROM user_sessions us
                 JOIN portal_users pu ON pu.id = us.user_id AND us.user_type = 'portal'
                 WHERE pu.billing_entity_id = :be
                 ORDER BY us.created_at DESC LIMIT :lim OFFSET :off",
                [':be' => $beId, ':lim' => $limit, ':off' => $off]
            );
        }
    } else {
        $rows = Database::query(
            "SELECT al.id, al.actor_name, al.actor_role, al.action, al.detail, al.ip_address, al.created_at
             FROM audit_log al
             WHERE al.action = 'LOGIN'
             ORDER BY al.created_at DESC LIMIT :lim OFFSET :off",
            [':lim' => $limit, ':off' => $off]
        );
    }
    Response::json(['data' => $rows]);
}, $auth);

// ── Admin: Coupons ────────────────────────────────────────────────────────────
$router->get('/api/admin/coupons', function (Request $req) {
    $rows = Database::query('SELECT * FROM coupons WHERE deleted = 0 ORDER BY created_at DESC', []);
    Response::json(['data' => $rows]);
}, $superAdmin);

$router->post('/api/admin/coupons', function (Request $req) {
    $b = $req->body;
    $code = strtoupper(trim($b['code'] ?? ''));
    if (!$code) Response::error('Code is required', 422);
    $type    = in_array($b['type'] ?? '', ['percent','fixed']) ? $b['type'] : 'percent';
    $value   = (float) ($b['value'] ?? 0);
    $maxUses = isset($b['max_uses']) ? (int)$b['max_uses'] : null;
    $expires = !empty($b['expires_at']) ? $b['expires_at'] : null;
    $id = Database::insert(
        'INSERT INTO coupons (code, type, value, max_uses, expires_at, active, deleted, created_at)
         VALUES (:code, :type, :value, :max_uses, :expires, 1, 0, NOW())',
        [':code'=>$code,':type'=>$type,':value'=>$value,':max_uses'=>$maxUses,':expires'=>$expires]
    );
    AuditService::log('COUPON_CREATED', 'staff', $req->user['userId'], '', $req->user['role'], "coupon:$id", $code, $req->ip);
    Response::json(['message' => 'Coupon created.', 'id' => $id], 201);
}, $superAdmin);

$router->patch('/api/admin/coupons/:id', function (Request $req) {
    $id = (int) $req->params['id'];
    $b  = $req->body;
    if (isset($b['deleted']) && $b['deleted']) {
        Database::execute('UPDATE coupons SET deleted = 1 WHERE id = :id', [':id' => $id]);
        Response::json(['message' => 'Deleted.']);
    }
    if (isset($b['active'])) {
        Database::execute('UPDATE coupons SET active = :a WHERE id = :id', [':a' => (int)$b['active'], ':id' => $id]);
        Response::json(['message' => 'Updated.']);
    }
    Response::error('Nothing to update', 422);
}, $superAdmin);

// ── DB Migrations (token-protected, one-time run) ────────────────────────────
$router->get('/api/scheduled/migrate-v3', function (Request $req) {
    $token = $req->query['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) Response::error('Forbidden', 403);
    require BASE_PATH . '/database/migrate_v3.php';
});


// ── Dispatch ──────────────────────────────────────────────────────────────────
$router->dispatch();
