<?php
declare(strict_types=1);

class WorkspaceUserController
{
    public function list(Request $req): void
    {
        $user   = $req->user;
        $domain   = $req->query['domain']    ?? null;
        $domainId = isset($req->query['domain_id']) ? (int)$req->query['domain_id'] : null;
        $status   = $req->query['status']    ?? null;

        $where  = ['1=1']; $params = [];

        // Domain owners can only see their billing entity's users
        if ($user['role'] === 'domain_owner') {
            $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $user['userId']]);
            $where[]              = 'wu.billing_entity_id = :be';
            $params[':be']        = $pu['billing_entity_id'];
        }

        if ($domainId) { $where[] = 'wu.domain_id = :did'; $params[':did'] = $domainId; }
        elseif ($domain) { $where[] = 'd.name = :domain'; $params[':domain'] = $domain; }
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
            Database::execute('UPDATE license_pool SET used = used - 1 WHERE billing_entity_id = :be AND plan_slug = :old AND used > 0', [':be' => $wu['billing_entity_id'], ':old' => $wu['plan_slug']]);
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

    // ── Action dispatcher (avoids ModSecurity blocking POST to sub-paths) ────
    // PATCH /api/workspace-users/:id/action  body: { "action": "suspend"|"unsuspend"|"reset-password"|"upgrade-plan"|"archive"|"archive-confirm"|"restore", ...params }

    public function dispatchAction(Request $req): void
    {
        $action = (string) ($req->body['action'] ?? '');
        match ($action) {
            'suspend'          => $this->suspend($req),
            'unsuspend'        => $this->unsuspend($req),
            'reset-password'   => $this->resetPassword($req),
            'upgrade-plan'     => $this->upgradePlan($req),
            'archive'          => $this->requestDelete($req),
            'archive-confirm'  => $this->confirmDelete($req),
            'restore'          => $this->recover($req),
            default            => Response::error('Unknown action: ' . htmlspecialchars($action), 400),
        };
    }

    // ── Delete Flow ───────────────────────────────────────────────────────────

    /**
     * Step 1: Request deletion.
     * Generates a 6-digit OTP, logs it (TODO: email when SMTP ready).
     * Decrements license pool used count immediately so owner can create a replacement.
     * Does NOT touch Google yet — only marks intent.
     */
    public function requestDelete(Request $req): void
    {
        $id = (int) $req->param('id');
        $wu = Database::queryOne(
            'SELECT wu.*, d.name AS domain_name, be.contact_email, be.name AS be_name, be.deletion_approver_emails
             FROM workspace_users wu
             JOIN domains d ON d.id = wu.domain_id
             JOIN billing_entities be ON be.id = wu.billing_entity_id
             WHERE wu.id = :id',
            [':id' => $id]
        );
        if (!$wu) Response::error('Not found.', 404);

        // Domain owners can only delete users in their billing entity
        if ($req->user['role'] === 'domain_owner') {
            $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
            if ((int)$pu['billing_entity_id'] !== (int)$wu['billing_entity_id']) {
                Response::error('Forbidden.', 403);
            }
        }

        if (in_array($wu['status'], ['deleted_pending', 'deleted'], true)) {
            Response::error('User is already pending deletion or deleted.', 400);
        }

        // Generate OTP
        $otp     = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        Database::execute(
            'UPDATE workspace_users SET deletion_otp = :otp, deletion_otp_expires_at = :exp WHERE id = :id',
            [':otp' => $otp, ':exp' => $expires, ':id' => $id]
        );

        // Build recipient list
        $recipients = [$wu['contact_email']];
        if ($wu['deletion_approver_emails']) {
            foreach (explode(',', $wu['deletion_approver_emails']) as $e) {
                $e = trim($e);
                if ($e && filter_var($e, FILTER_VALIDATE_EMAIL)) $recipients[] = $e;
            }
        }
        $recipients = array_unique($recipients);

        // TODO: send OTP email via SMTP to all $recipients
        // EmailService::sendDeletionOtp($wu, $otp, $recipients);
        Logger::info("[Delete] OTP for {$wu['email']} → $otp (expires $expires) | Recipients: " . implode(', ', $recipients));

        AuditService::log('DELETE_REQUESTED', $req->user['userType'], $req->user['userId'], $req->user['name'] ?? '', $req->user['role'], $wu['email'], "OTP sent to: " . implode(', ', $recipients), $req->ip);

        Response::json([
            'message'         => 'OTP sent to ' . implode(', ', $recipients) . '. Valid for 15 minutes.',
            'otp_sent_to'     => $recipients,
            // DEV ONLY — remove when SMTP is live:
            '_dev_otp'        => $otp,
        ]);
    }

    /**
     * Step 2: Confirm deletion with OTP.
     * Validates OTP → suspends in Google → status = deleted_pending → frees license.
     */
    public function confirmDelete(Request $req): void
    {
        $id  = (int) $req->param('id');
        $otp = trim((string) ($req->body['otp'] ?? ''));

        if (!$otp) Response::error('OTP is required.', 422);

        $wu = Database::queryOne(
            'SELECT wu.*, be.contact_email
             FROM workspace_users wu
             JOIN billing_entities be ON be.id = wu.billing_entity_id
             WHERE wu.id = :id',
            [':id' => $id]
        );
        if (!$wu) Response::error('Not found.', 404);

        if (in_array($wu['status'], ['deleted_pending', 'deleted'], true)) {
            Response::error('User is already deleted.', 400);
        }
        if (!$wu['deletion_otp']) Response::error('No pending deletion request. Request deletion first.', 400);
        if (strtotime($wu['deletion_otp_expires_at']) < time()) Response::error('OTP has expired. Please request again.', 400);
        if ($wu['deletion_otp'] !== $otp) Response::error('Invalid OTP.', 400);

        // Suspend in Google immediately
        GoogleWorkspaceService::suspendUser($wu['email']);

        $now = date('Y-m-d H:i:s');
        Database::beginTransaction();
        try {
            Database::execute(
                "UPDATE workspace_users SET
                   status = 'deleted_pending',
                   deletion_requested_at = :now,
                   deletion_confirmed_by = :by,
                   deletion_otp = NULL,
                   deletion_otp_expires_at = NULL
                 WHERE id = :id",
                [':now' => $now, ':by' => $req->user['userId'], ':id' => $id]
            );

            // Free the license slot immediately (only if used > 0 to avoid unsigned underflow)
            Database::execute(
                'UPDATE license_pool SET used = used - 1
                 WHERE billing_entity_id = :be AND plan_slug = :plan AND used > 0',
                [':be' => $wu['billing_entity_id'], ':plan' => $wu['plan_slug']]
            );
            Database::commit();
        } catch (Throwable $e) {
            Database::rollback();
            Logger::error('[Delete] confirmDelete transaction failed: ' . $e->getMessage());
            Response::error('Deletion failed. Please try again.', 500);
        }

        AuditService::log('DELETE_CONFIRMED', $req->user['userType'], $req->user['userId'], $req->user['name'] ?? '', $req->user['role'], $wu['email'], "Suspended in Google. Hard delete after 30 days.", $req->ip);

        Response::json(['message' => 'User deleted. Account suspended in Google and will be permanently removed after 30 days. License freed immediately.']);
    }

    /**
     * List recoverable users (deleted_pending) for the caller's billing entity.
     * Shows days remaining before permanent deletion.
     */
    public function recoverable(Request $req): void
    {
        $user = $req->user;

        if ($user['role'] === 'domain_owner') {
            $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $user['userId']]);
            $beId = (int) $pu['billing_entity_id'];
        } else {
            // Staff: filter by billing_entity_id query param if provided
            $beId = isset($req->query['billing_entity_id']) ? (int) $req->query['billing_entity_id'] : null;
        }

        $where  = ["wu.status = 'deleted_pending'"];
        $params = [];
        if ($beId) { $where[] = 'wu.billing_entity_id = :be'; $params[':be'] = $beId; }

        $rows = Database::query(
            'SELECT wu.id, wu.first_name, wu.last_name, wu.email, wu.plan_slug,
                    wu.deletion_requested_at, d.name AS domain_name,
                    be.name AS billing_entity_name,
                    DATEDIFF(DATE_ADD(wu.deletion_requested_at, INTERVAL 30 DAY), NOW()) AS days_remaining
             FROM workspace_users wu
             JOIN domains d ON d.id = wu.domain_id
             JOIN billing_entities be ON be.id = wu.billing_entity_id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY wu.deletion_requested_at DESC',
            $params
        );

        Response::json(['data' => $rows]);
    }

    /**
     * Recover a deleted_pending user (within 30 days).
     * Checks license pool has space — if not, returns 422 with buy_licenses hint.
     */
    public function recover(Request $req): void
    {
        $id = (int) $req->param('id');
        $wu = Database::queryOne(
            'SELECT * FROM workspace_users WHERE id = :id AND status = :s',
            [':id' => $id, ':s' => 'deleted_pending']
        );
        if (!$wu) Response::error('User not found or not in recoverable state.', 404);

        // Check 30-day window
        $daysElapsed = (time() - strtotime($wu['deletion_requested_at'])) / 86400;
        if ($daysElapsed > 30) {
            Response::error('Recovery window has expired (30 days). Account cannot be recovered.', 410);
        }

        // Domain owner scope check
        if ($req->user['role'] === 'domain_owner') {
            $pu = Database::queryOne('SELECT billing_entity_id FROM portal_users WHERE id = :id', [':id' => $req->user['userId']]);
            if ((int)$pu['billing_entity_id'] !== (int)$wu['billing_entity_id']) {
                Response::error('Forbidden.', 403);
            }
        }

        // Check license pool
        $pool = Database::queryOne(
            'SELECT allocated, used FROM license_pool WHERE billing_entity_id = :be AND plan_slug = :plan',
            [':be' => $wu['billing_entity_id'], ':plan' => $wu['plan_slug']]
        );
        $available = $pool ? ((int)$pool['allocated'] - (int)$pool['used']) : 0;
        if ($available < 1) {
            Response::error('No available license for this plan. Please purchase a license before recovering.', 422);
        }

        // Unsuspend in Google
        GoogleWorkspaceService::unsuspendUser($wu['email']);

        Database::beginTransaction();
        try {
            Database::execute(
                "UPDATE workspace_users SET
                   status = 'active',
                   deletion_requested_at = NULL,
                   deletion_confirmed_by = NULL,
                   deleted_at = NULL
                 WHERE id = :id",
                [':id' => $id]
            );
            Database::execute(
                'UPDATE license_pool SET used = used + 1 WHERE billing_entity_id = :be AND plan_slug = :plan',
                [':be' => $wu['billing_entity_id'], ':plan' => $wu['plan_slug']]
            );
            Database::commit();
        } catch (Throwable $e) {
            Database::rollback();
            Logger::error('[Delete] recover failed: ' . $e->getMessage());
            Response::error('Recovery failed.', 500);
        }

        AuditService::log('USER_RECOVERED', $req->user['userType'], $req->user['userId'], $req->user['name'] ?? '', $req->user['role'], $wu['email'], "Recovered from deleted_pending.", $req->ip);

        Response::json(['message' => 'User recovered successfully. Account is active again.']);
    }
}
