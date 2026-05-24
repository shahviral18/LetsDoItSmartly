<?php
declare(strict_types=1);

class WorkspaceUserController
{
    public function list(Request $req): void
    {
        $user   = $req->user;
        $domain = $req->query['domain'] ?? null;
        $status = $req->query['status'] ?? null;

        $where  = ['1=1']; $params = [];

        // Domain owners can only see their billing entity's users
        if ($user['role'] === 'domain_owner') {
            $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $user['userId']]);
            $where[]              = 'wu.billing_entity_id = :be';
            $params[':be']        = $pu['billing_entity_id'];
        }

        if ($domain) { $where[] = 'd.name = :domain'; $params[':domain'] = $domain; }
        if ($status) { $where[] = 'wu.status = :status'; $params[':status'] = $status; }

        $sql = 'SELECT wu.*, d.name AS domain_name
                FROM workspace_users wu
                JOIN domains d ON d.id = wu.domain_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY wu.email';

        Response::json(['data' => Database::query($sql, $params)]);
    }

    public function get(Request $req): void
    {
        $id   = (int) $req->param('id');
        $user = Database::queryOne(
            'SELECT wu.*, d.name AS domain_name, d.ou_path AS domain_ou
             FROM workspace_users wu JOIN domains d ON d.id = wu.domain_id
             WHERE wu.id = :id',
            [':id' => $id]
        );
        if (!$user) Response::error('Not found', 404);
        Response::json($user);
    }

    public function create(Request $req): void
    {
        $b = $req->body;
        foreach (['first_name','last_name','email','domain_id','plan_slug'] as $f) {
            if (empty($b[$f])) Response::error("$f is required.", 400);
        }

        $email    = strtolower(trim($b['email']));
        $domainId = (int) $b['domain_id'];
        $plan     = (string) $b['plan_slug'];

        // Check domain exists
        $domain = Database::queryOne('SELECT * FROM domains WHERE id = :id AND is_active = 1', [':id' => $domainId]);
        if (!$domain) Response::error('Domain not found.', 404);

        // Check license availability
        $pool = Database::queryOne(
            'SELECT allocated, used FROM license_pool WHERE billing_entity_id = :be AND plan_slug = :plan',
            [':be' => $domain['billing_entity_id'], ':plan' => $plan]
        );
        if (!$pool || (int)$pool['used'] >= (int)$pool['allocated']) {
            Response::error('No available licenses for this plan. Please purchase more.', 422);
        }

        // Build OU path: domainOU/planSuffix
        $planRow = Database::queryOne('SELECT ou_suffix FROM plans WHERE slug = :s', [':s' => $plan]);
        $ouSuffix = $planRow['ou_suffix'] ?? $plan[0];
        $ouPath   = rtrim($domain['ou_path'], '/') . '/' . $ouSuffix;

        // Ensure OU exists in Google Workspace
        GoogleWorkspaceService::ensureOrgUnit($ouPath);

        // Create in Google Workspace
        $tempPass = GoogleWorkspaceService::createUser($email, $b['first_name'], $b['last_name'], $ouPath);

        // Insert into DB
        $id = Database::insert(
            'INSERT INTO workspace_users
             (domain_id, billing_entity_id, first_name, last_name, email, plan_slug, ou_path, status, created_via_portal)
             VALUES (:did, :be, :fn, :ln, :email, :plan, :ou, "active", 1)',
            [
                ':did'   => $domainId,
                ':be'    => $domain['billing_entity_id'],
                ':fn'    => $b['first_name'],
                ':ln'    => $b['last_name'],
                ':email' => $email,
                ':plan'  => $plan,
                ':ou'    => $ouPath,
            ]
        );

        // Increment used count
        Database::execute(
            'UPDATE license_pool SET used = used + 1 WHERE billing_entity_id = :be AND plan_slug = :plan',
            [':be' => $domain['billing_entity_id'], ':plan' => $plan]
        );

        AuditService::log('USER_CREATED', $req->user['userType'], $req->user['userId'], '', $req->user['role'], $email, "Plan: $plan, Domain: {$domain['name']}", $req->ip);

        // TODO: send welcome email with $tempPass

        Response::json(['id' => $id, 'email' => $email, 'temp_password' => $tempPass, 'ou_path' => $ouPath], 201);
    }

    public function update(Request $req): void
    {
        $id = (int) $req->param('id');
        $b  = $req->body;
        $sets = []; $params = [':id' => $id];
        foreach (['first_name','last_name'] as $f) {
            if (isset($b[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $b[$f]; }
        }
        if (!$sets) Response::error('Nothing to update.', 400);
        Database::execute('UPDATE workspace_users SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        Response::json(['message' => 'Updated.']);
    }

    public function suspend(Request $req): void
    {
        $id   = (int) $req->param('id');
        $user = Database::queryOne('SELECT email, status FROM workspace_users WHERE id = :id', [':id' => $id]);
        if (!$user) Response::error('Not found', 404);
        if ($user['status'] === 'suspended') Response::error('Already suspended.', 400);

        GoogleWorkspaceService::suspendUser($user['email']);
        Database::execute("UPDATE workspace_users SET status = 'suspended' WHERE id = :id", [':id' => $id]);
        AuditService::log('USER_SUSPENDED', $req->user['userType'], $req->user['userId'], '', $req->user['role'], $user['email'], '', $req->ip);
        Response::json(['message' => 'User suspended.']);
    }

    public function unsuspend(Request $req): void
    {
        $id   = (int) $req->param('id');
        $user = Database::queryOne('SELECT email, status FROM workspace_users WHERE id = :id', [':id' => $id]);
        if (!$user) Response::error('Not found', 404);

        GoogleWorkspaceService::unsuspendUser($user['email']);
        Database::execute("UPDATE workspace_users SET status = 'active' WHERE id = :id", [':id' => $id]);
        AuditService::log('USER_REACTIVATED', $req->user['userType'], $req->user['userId'], '', $req->user['role'], $user['email'], '', $req->ip);
        Response::json(['message' => 'User unsuspended.']);
    }

    public function resetPassword(Request $req): void
    {
        $id   = (int) $req->param('id');
        $user = Database::queryOne('SELECT email FROM workspace_users WHERE id = :id', [':id' => $id]);
        if (!$user) Response::error('Not found', 404);

        $newPass = GoogleWorkspaceService::generateTempPassword();
        GoogleWorkspaceService::updatePassword($user['email'], $newPass);
        AuditService::log('PASSWORD_RESET', $req->user['userType'], $req->user['userId'], '', $req->user['role'], $user['email'], '', $req->ip);
        Response::json(['temp_password' => $newPass]);
    }

    public function upgradePlan(Request $req): void
    {
        $id      = (int) $req->param('id');
        $newPlan = (string) ($req->body['plan_slug'] ?? '');
        if (!$newPlan) Response::error('plan_slug required.', 400);

        $wu = Database::queryOne('SELECT * FROM workspace_users WHERE id = :id', [':id' => $id]);
        if (!$wu) Response::error('Not found', 404);
        if ($wu['plan_slug'] === $newPlan) Response::error('Already on this plan.', 400);

        // Check license pool for new plan
        $pool = Database::queryOne(
            'SELECT allocated, used FROM license_pool WHERE billing_entity_id = :be AND plan_slug = :plan',
            [':be' => $wu['billing_entity_id'], ':plan' => $newPlan]
        );
        if (!$pool || (int)$pool['used'] >= (int)$pool['allocated']) {
            Response::error('No available licenses for the target plan.', 422);
        }

        // Build new OU path
        $planRow  = Database::queryOne('SELECT ou_suffix FROM plans WHERE slug = :s', [':s' => $newPlan]);
        $domain   = Database::queryOne('SELECT ou_path FROM domains WHERE id = :id', [':id' => $wu['domain_id']]);
        $newOu    = rtrim($domain['ou_path'], '/') . '/' . $planRow['ou_suffix'];

        GoogleWorkspaceService::ensureOrgUnit($newOu);
        GoogleWorkspaceService::moveUserToOrgUnit($wu['email'], $newOu);

        Database::beginTransaction();
        try {
            // Free old plan slot, consume new plan slot
            Database::execute('UPDATE license_pool SET used = used - 1 WHERE billing_entity_id = :be AND plan_slug = :old', [':be' => $wu['billing_entity_id'], ':old' => $wu['plan_slug']]);
            Database::execute('UPDATE license_pool SET used = used + 1 WHERE billing_entity_id = :be AND plan_slug = :new', [':be' => $wu['billing_entity_id'], ':new' => $newPlan]);
            Database::execute('UPDATE workspace_users SET plan_slug = :plan, ou_path = :ou WHERE id = :id', [':plan' => $newPlan, ':ou' => $newOu, ':id' => $id]);
            Database::commit();
        } catch (Throwable $e) {
            Database::rollback();
            Logger::error('[WorkspaceUser] upgradePlan failed: ' . $e->getMessage());
            Response::error('Plan upgrade failed.', 500);
        }

        AuditService::log('PLAN_CHANGED', $req->user['userType'], $req->user['userId'], '', $req->user['role'], $wu['email'], "{$wu['plan_slug']} → $newPlan", $req->ip);
        Response::json(['message' => 'Plan upgraded.', 'new_plan' => $newPlan, 'new_ou' => $newOu]);
    }
}
