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

    Response::json([
        'totalUsers' => $totalUsers, 'activeUsers' => $activeUsers,
        'totalDomains' => $totalDomains, 'totalBillingEntities' => $totalBe,
        'pendingInvoices' => $pendingInv, 'totalRevenue' => $totalRev,
        'unresolved2svUsers' => $no2sv,
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
$router->get  ('/api/domains',              [DomainController::class, 'list'],   $staffAuth);
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
$router->get('/api/cron/run-renewals', function (Request $req) {
    $token = $req->query['token'] ?? '';
    if ($token !== INTERNAL_CRON_TOKEN) Response::error('Forbidden', 403);
    require BASE_PATH . '/cron/renewal-reminders.php';
});
$router->get('/api/cron/run-hard-delete', function (Request $req) {
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
    foreach ($req->body as $key => $value) {
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

    // 2SV disabled = High severity
    $rows = Database::query(
        "SELECT wu.id, CONCAT(wu.first_name,' ',wu.last_name) AS user_name,
                wu.email, d.name AS domain_name, wu.status, wu.created_at
         FROM workspace_users wu
         JOIN domains d ON d.id = wu.domain_id
         WHERE wu.two_sv_enabled = 0 AND wu.status = 'active' $beFilter
         ORDER BY wu.email LIMIT 200",
        $params
    );

    $alerts = [];
    foreach ($rows as $r) {
        $alerts[] = [
            'id'        => 'sv_' . $r['id'],
            'user_name' => $r['user_name'],
            'email'     => $r['email'],
            'domain'    => $r['domain_name'],
            'type'      => '2sv_disabled',
            'severity'  => 'high',
            'message'   => '2-Step Verification is disabled',
            'resolved'  => false,
            'timestamp' => $r['created_at'],
        ];
    }
    Response::json(['data' => $alerts]);
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

// ── Dispatch ──────────────────────────────────────────────────────────────────
$router->dispatch();
