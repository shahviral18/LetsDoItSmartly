<?php
declare(strict_types=1);

/**
 * GoogleWorkspaceService — LDIS adaptation
 *
 * Same Google Admin account as WMD (domain-wide delegation, same service account).
 * Key differences from WMD:
 *   - Manages multiple CLIENT domains (not just @webmydrive.com)
 *   - isProvisioned() checks the workspace_users DB table, not email suffix
 *   - createOrgUnit() — creates sub-OU on-demand per plan
 *   - NEVER deletes users — suspend/unsuspend only
 *
 * SAFETY: During testing, only CREATE operations are allowed.
 *         suspend/unsuspend guarded by DB check — won't touch WMD users.
 */
class GoogleWorkspaceService
{
    private const SCOPES = [
        'https://www.googleapis.com/auth/admin.directory.user',
        'https://www.googleapis.com/auth/admin.directory.orgunit',
        'https://www.googleapis.com/auth/admin.directory.user.security',
    ];
    private const REPORTS_SCOPES = [
        'https://www.googleapis.com/auth/admin.reports.audit.readonly',
        'https://www.googleapis.com/auth/admin.reports.usage.readonly',
    ];
    private const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

    private static bool $loaded = false;

    private static function boot(): void
    {
        if (self::$loaded) return;
        $autoload = GOOGLE_API_BASE . '/vendor/autoload.php';
        if (!file_exists($autoload)) {
            throw new RuntimeException('Google API library not found: ' . $autoload);
        }
        require_once $autoload;
        self::$loaded = true;
    }

    private static function getService(): object
    {
        self::boot();
        $client = new Google_Client();
        $client->setApplicationName('LetsDoItSmartly');
        $client->setAuthConfig(GOOGLE_CREDENTIALS);
        $client->setScopes(self::SCOPES);
        $client->setSubject(GOOGLE_ADMIN_EMAIL);
        return new Google_Service_Directory($client);
    }

    private static function getReportsService(): object
    {
        self::boot();
        $client = new Google_Client();
        $client->setApplicationName('LetsDoItSmartly');
        $client->setAuthConfig(GOOGLE_CREDENTIALS);
        $client->setScopes(self::REPORTS_SCOPES);
        $client->setSubject(GOOGLE_ADMIN_EMAIL);
        return new Google_Service_Reports($client);
    }

    private static function getDriveService(string $userEmail): object
    {
        self::boot();
        $client = new Google_Client();
        $client->setApplicationName('LetsDoItSmartly');
        $client->setAuthConfig(GOOGLE_CREDENTIALS);
        $client->setScopes([self::DRIVE_SCOPE]);
        $client->setSubject($userEmail);
        return new Google_Service_Drive($client);
    }

    private static ?Google_Service_Drive $adminDriveService = null;

    private static function getAdminDriveService(): Google_Service_Drive
    {
        if (self::$adminDriveService !== null) return self::$adminDriveService;
        self::boot();
        $client = new Google_Client();
        $client->setApplicationName('LetsDoItSmartly');
        $client->setAuthConfig(GOOGLE_CREDENTIALS);
        $client->setScopes([self::DRIVE_SCOPE]);
        $client->setSubject(GOOGLE_ADMIN_EMAIL);
        self::$adminDriveService = new Google_Service_Drive($client);
        return self::$adminDriveService;
    }

    // ── Guard — only touch users that belong to LDIS-managed domains ─────────

    /**
     * Returns true if the email belongs to a domain we manage in LDIS.
     * Checks workspace_users table to avoid touching WMD users accidentally.
     */
    public static function isManaged(string $email): bool
    {
        if (!$email || !str_contains($email, '@')) return false;
        $domain = strtolower(explode('@', $email)[1]);
        $row = Database::queryOne(
            'SELECT id FROM domains WHERE name = :domain AND is_active = 1',
            [':domain' => $domain]
        );
        return $row !== null;
    }

    public static function generateTempPassword(): string
    {
        return 'Welcome@' . rand(1000, 9999);
    }

    // ── OU Management ─────────────────────────────────────────────────────────

    /**
     * Ensure an OU path exists; create it if it doesn't.
     * Used when first user of a plan is added to a billing entity.
     * Path example: /defaultOU/abc/b
     */
    public static function ensureOrgUnit(string $ouPath): bool
    {
        try {
            $service = self::getService();
            $apiPath = ltrim($ouPath, '/');
            try {
                $service->orgunits->get('my_customer', $apiPath);
                return true; // already exists
            } catch (Throwable $e) {
                // Doesn't exist — create it
            }
            // Build name and parent from path segments
            $segments   = explode('/', trim($ouPath, '/'));
            $name       = array_pop($segments);
            $parentPath = '/' . implode('/', $segments);

            $ou = new Google_Service_Directory_OrgUnit();
            $ou->setName($name);
            $ou->setParentOrgUnitPath($parentPath ?: '/');
            $service->orgunits->insert('my_customer', $ou);
            Logger::info("[GWS] ensureOrgUnit created: $ouPath");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] ensureOrgUnit FAILED $ouPath: " . $e->getMessage());
            return false;
        }
    }

    // ── User CRUD ─────────────────────────────────────────────────────────────

    /**
     * Create a new Google Workspace user.
     * Returns temp password on success, throws on failure.
     */
    public static function createUser(
        string $email,
        string $firstName,
        string $lastName,
        string $orgUnitPath = '/'
    ): string {
        self::boot();
        $service = self::getService();
        $temp    = self::generateTempPassword();

        $user = new Google_Service_Directory_User();
        $user->setPrimaryEmail($email);
        $user->setPassword($temp);
        $user->setChangePasswordAtNextLogin(false);
        $user->setOrgUnitPath('/' . ltrim($orgUnitPath, '/'));

        $name = new Google_Service_Directory_UserName();
        $name->setGivenName($firstName ?: explode('@', $email)[0]);
        $name->setFamilyName($lastName ?: '.');
        $user->setName($name);

        $service->users->insert($user);
        Logger::info("[GWS] createUser OK → $email (OU: $orgUnitPath)");
        return $temp;
    }

    /**
     * Suspend a user. Only operates on LDIS-managed domains.
     */
    public static function suspendUser(string $email): bool
    {
        if (!self::isManaged($email)) {
            Logger::warn("[GWS] suspendUser blocked — $email not in LDIS domains");
            return false;
        }
        try {
            $service = self::getService();
            $patch   = new Google_Service_Directory_User();
            $patch->setSuspended(true);
            $service->users->patch($email, $patch);
            Logger::info("[GWS] suspendUser OK → $email");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] suspendUser FAILED → $email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Unsuspend a user. Only operates on LDIS-managed domains.
     */
    public static function unsuspendUser(string $email): bool
    {
        if (!self::isManaged($email)) {
            Logger::warn("[GWS] unsuspendUser blocked — $email not in LDIS domains");
            return false;
        }
        try {
            $service = self::getService();
            $patch   = new Google_Service_Directory_User();
            $patch->setSuspended(false);
            $service->users->patch($email, $patch);
            Logger::info("[GWS] unsuspendUser OK → $email");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] unsuspendUser FAILED → $email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Move a user to a different OU (plan upgrade/downgrade).
     */
    public static function moveUserToOrgUnit(string $email, string $ouPath): bool
    {
        if (!self::isManaged($email)) return false;
        try {
            $service = self::getService();
            $patch   = new Google_Service_Directory_User();
            $patch->setOrgUnitPath('/' . ltrim($ouPath, '/'));
            $service->users->patch($email, $patch);
            Logger::info("[GWS] moveUserToOrgUnit → $email → $ouPath");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] moveUserToOrgUnit FAILED → $email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update password for a workspace user.
     */
    public static function updatePassword(string $email, string $password): bool
    {
        if (!self::isManaged($email) || strlen($password) < 8) return false;
        try {
            $service = self::getService();
            $patch   = new Google_Service_Directory_User();
            $patch->setPassword($password);
            $patch->setChangePasswordAtNextLogin(false);
            $service->users->patch($email, $patch);
            Logger::info("[GWS] updatePassword OK → $email");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] updatePassword FAILED → $email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update user properties in Google Workspace.
     * $data keys: new_email, first_name, last_name, recovery_email, phone
     */
    public static function updateUser(string $currentEmail, array $data): bool
    {
        if (!self::isManaged($currentEmail)) {
            Logger::warn("[GWS] updateUser blocked — $currentEmail not in LDIS domains");
            return false;
        }
        try {
            $service = self::getService();
            $patch   = new Google_Service_Directory_User();

            if (!empty($data['new_email'])) {
                if (!self::isManaged($data['new_email'])) throw new \RuntimeException('New email domain not managed.');
                $patch->setPrimaryEmail($data['new_email']);
            }
            if (!empty($data['first_name']) || !empty($data['last_name'])) {
                $name = new Google_Service_Directory_UserName();
                if (!empty($data['first_name'])) $name->setGivenName($data['first_name']);
                if (!empty($data['last_name']))  $name->setFamilyName($data['last_name']);
                $patch->setName($name);
            }
            if (array_key_exists('recovery_email', $data)) {
                $patch->setRecoveryEmail($data['recovery_email']);
            }
            if (array_key_exists('phone', $data)) {
                if ($data['phone']) {
                    $phone = new Google_Service_Directory_UserPhone();
                    $phone->setValue($data['phone']);
                    $phone->setType('mobile');
                    $patch->setPhones([$phone]);
                } else {
                    $patch->setPhones([]);
                }
            }

            $service->users->patch($currentEmail, $patch);
            Logger::info("[GWS] updateUser OK → $currentEmail");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] updateUser FAILED → $currentEmail: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Check 2FA enrollment status.
     */
    public static function get2FAStatus(string $email): ?bool
    {
        try {
            $service = self::getService();
            $user    = $service->users->get($email, ['fields' => 'isEnrolledIn2Sv']);
            return (bool) $user->getIsEnrolledIn2Sv();
        } catch (Throwable $e) {
            Logger::error("[GWS] get2FAStatus FAILED → $email: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get storage quota for a user.
     */
    public static function getStorageInfo(string $email): ?array
    {
        try {
            $drive = self::getDriveService($email);
            $about = $drive->about->get(['fields' => 'storageQuota']);
            $q     = $about->getStorageQuota();
            return [
                'used'  => (int) ($q->getUsage() ?? 0),
                'limit' => (int) ($q->getLimit() ?? 0),
                'drive' => (int) ($q->getUsageInDrive() ?? 0),
                'mail'  => max(0, (int)($q->getUsage() ?? 0) - (int)($q->getUsageInDrive() ?? 0)),
            ];
        } catch (Throwable $e) {
            Logger::error("[GWS] getStorageInfo FAILED → $email: " . $e->getMessage());
            return null;
        }
    }

    /**
     * List all users in a specific domain/OU (for sync).
     */
    public static function listDomainUsers(string $domain): array
    {
        try {
            $service   = self::getService();
            $users     = [];
            $pageToken = null;
            do {
                $params = ['domain' => $domain, 'maxResults' => 500, 'projection' => 'full', 'showDeleted' => 'false'];
                if ($pageToken) $params['pageToken'] = $pageToken;
                $result    = $service->users->listUsers($params);
                $pageToken = $result->getNextPageToken();
                foreach ($result->getUsers() as $u) {
                    $name = $u->getName();
                    $users[] = [
                        'email'         => strtolower($u->getPrimaryEmail()),
                        'firstName'     => $name?->getGivenName(),
                        'lastName'      => $name?->getFamilyName(),
                        'suspended'     => (bool) $u->getSuspended(),
                        'twoSVEnabled'  => (bool) $u->getIsEnrolledIn2Sv(),
                        'lastLogin'     => $u->getLastLoginTime(),
                        'createdAt'     => $u->getCreationTime(),
                        'ouPath'        => $u->getOrgUnitPath(),
                    ];
                }
            } while ($pageToken);
            Logger::info("[GWS] listDomainUsers: $domain → " . count($users) . ' users');
            return $users;
        } catch (Throwable $e) {
            Logger::error("[GWS] listDomainUsers FAILED → $domain: " . $e->getMessage());
            return [];
        }
    }

    /**
     * List ALL users across the entire Google Workspace (all domains/OUs).
     * Uses customer=my_customer so no per-domain enumeration needed.
     */
    public static function listAllUsers(): array
    {
        try {
            $service   = self::getService();
            $users     = [];
            $pageToken = null;
            do {
                $params = ['customer' => 'my_customer', 'maxResults' => 500, 'projection' => 'full', 'showDeleted' => 'false'];
                if ($pageToken) $params['pageToken'] = $pageToken;
                $result    = $service->users->listUsers($params);
                $pageToken = $result->getNextPageToken();
                foreach ($result->getUsers() ?? [] as $u) {
                    $name    = $u->getName();
                    $users[] = [
                        'email'        => strtolower($u->getPrimaryEmail()),
                        'firstName'    => $name?->getGivenName(),
                        'lastName'     => $name?->getFamilyName(),
                        'suspended'    => (bool) $u->getSuspended(),
                        'twoSVEnabled' => (bool) $u->getIsEnrolledIn2Sv(),
                        'lastLogin'    => $u->getLastLoginTime(),
                        'createdAt'    => $u->getCreationTime(),
                        'ouPath'       => $u->getOrgUnitPath(),
                    ];
                }
            } while ($pageToken);
            Logger::info("[GWS] listAllUsers → " . count($users) . ' users across all domains');
            return $users;
        } catch (Throwable $e) {
            Logger::error("[GWS] listAllUsers FAILED: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get shared drives the user belongs to.
     */
    public static function getSharedDrives(string $email): array
    {
        try {
            $drive  = self::getDriveService($email);
            $result = $drive->drives->listDrives(['pageSize' => 50, 'fields' => 'drives(id,name,createdTime)']);
            $drives = [];
            foreach ($result->getDrives() as $d) {
                $drives[] = [
                    'id'          => $d->getId(),
                    'name'        => $d->getName(),
                    'createdTime' => $d->getCreatedTime(),
                ];
            }
            return $drives;
        } catch (Throwable $e) {
            Logger::error("[GWS] getSharedDrives FAILED → $email: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Fetch last N login events for a user from Google Reports API.
     * Returns array of: timestamp, ip_address, event_name, is_suspicious
     */
    public static function getLoginHistory(string $email, int $maxResults = 10): array
    {
        try {
            $reports = self::getReportsService();
            // Fetch all login events for user (success, failure, logout, suspicious)
            $result  = $reports->activities->listActivities(
                $email, 'login', ['maxResults' => $maxResults]
            );
            $events  = [];
            foreach ($result->getItems() ?? [] as $item) {
                $loginType       = '';
                $isSusp          = false;
                $challenge       = '';
                $challengeResult = '';
                foreach ($item->getEvents() as $ev) {
                    foreach ($ev->getParameters() ?? [] as $p) {
                        switch ($p->getName()) {
                            case 'login_type':             $loginType       = (string) $p->getValue(); break;
                            case 'is_suspicious':          $isSusp          = (bool)   $p->getBoolValue(); break;
                            case 'login_challenge_method': $challenge       = (string) $p->getValue(); break;
                            case 'login_challenge_result': $challengeResult = (string) $p->getValue(); break;
                        }
                    }
                }
                $events[] = [
                    'timestamp'        => $item->getId()->getTime(),
                    'login_type'       => $loginType ?: 'google_password',
                    'challenge'        => $challenge,
                    'challenge_result' => $challengeResult,
                    'is_suspicious'    => $isSusp,
                    'event_name'       => $item->getEvents()[0]->getName() ?? 'login_success',
                ];
            }
            return $events;
        } catch (Throwable $e) {
            Logger::error("[GWS] getLoginHistory FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Force sign out a user from all Google sessions on all devices.
     * Requires admin.directory.user.security scope in domain-wide delegation.
     */
    public static function signOutUser(string $email): bool
    {
        if (!self::isManaged($email)) {
            Logger::error("[GWS] signOutUser BLOCKED — $email is not managed");
            return false;
        }
        try {
            $service = self::getService();
            $service->users->signOut($email);
            Logger::info("[GWS] signOutUser OK → $email");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] signOutUser FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * List all shared drives in the Google Workspace tenant.
     * Uses admin-level Drive service (subject = admin email, not user impersonation).
     */
    public static function listSharedDrives(): array
    {
        try {
            $drive = self::getAdminDriveService();
            $result = [];
            $pageToken = null;
            do {
                $opts = ['pageSize' => 100, 'useDomainAdminAccess' => true, 'fields' => 'nextPageToken,drives(id,name,createdTime)'];
                if ($pageToken) $opts['pageToken'] = $pageToken;
                $resp = $drive->drives->listDrives($opts);
                foreach ($resp->getDrives() as $d) {
                    $result[] = ['id' => $d->getId(), 'name' => $d->getName(), 'created_at' => $d->getCreatedTime()];
                }
                $pageToken = $resp->getNextPageToken();
            } while ($pageToken);
            return $result;
        } catch (Throwable $e) {
            Logger::error('[GWS] listSharedDrives FAILED: ' . $e->getMessage());
            throw $e;
        }
    }

    public static function getSharedDriveMembers(string $driveId): array
    {
        try {
            $drive = self::getAdminDriveService();
            $resp  = $drive->permissions->listPermissions($driveId, [
                'supportsAllDrives'    => true,
                'useDomainAdminAccess' => true,
                'fields'               => 'permissions(id,emailAddress,role,type)',
            ]);
            $members = [];
            foreach ($resp->getPermissions() as $p) {
                if ($p->getType() === 'user' && $p->getEmailAddress()) {
                    $members[] = ['email' => $p->getEmailAddress(), 'role' => $p->getRole()];
                }
            }
            return $members;
        } catch (Throwable $e) {
            Logger::error("[GWS] getSharedDriveMembers FAILED $driveId: " . $e->getMessage());
            throw $e;
        }
    }

    public static function ensureSyncJobTable(): void
    {
        Database::execute("CREATE TABLE IF NOT EXISTS sync_jobs (
            job         VARCHAR(64)  NOT NULL PRIMARY KEY,
            status      VARCHAR(32)  NOT NULL DEFAULT 'idle',
            total       INT UNSIGNED NOT NULL DEFAULT 0,
            done        INT UNSIGNED NOT NULL DEFAULT 0,
            errors      INT UNSIGNED NOT NULL DEFAULT 0,
            started_at  DATETIME     DEFAULT NULL,
            finished_at DATETIME     DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4", []);
    }

    public static function updateSyncJob(string $job, string $status, int $total, int $done, int $errors): void
    {
        self::ensureSyncJobTable();
        $finished = in_array($status, ['done', 'failed']) ? 'NOW()' : 'NULL';
        $started  = $status === 'running' ? 'NOW()' : 'started_at';
        Database::execute(
            "INSERT INTO sync_jobs (job, status, total, done, errors, started_at, finished_at)
             VALUES (:job, :st, :tot, :done, :err, NOW(), $finished)
             ON DUPLICATE KEY UPDATE
               status = VALUES(status), total = VALUES(total), done = VALUES(done),
               errors = VALUES(errors),
               started_at  = IF(VALUES(status) = 'running', NOW(), started_at),
               finished_at = $finished",
            [':job' => $job, ':st' => $status, ':tot' => $total, ':done' => $done, ':err' => $errors]
        );
    }

    /**
     * Full sync: fetch all shared drives + members from Google, upsert into shared_drives table.
     * Called by nightly cron and manual refresh endpoint.
     */
    public static function syncSharedDrivesToDb(): array
    {
        $start   = microtime(true);
        $synced  = 0;
        $errors  = 0;

        // Auto-create table if missing (with storage_mb column)
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

        // Add storage_mb column if table existed without it
        try {
            Database::execute("ALTER TABLE shared_drives ADD COLUMN storage_mb BIGINT UNSIGNED NOT NULL DEFAULT 0", []);
        } catch (Throwable $e) { /* column already exists */ }

        self::updateSyncJob('shared_drives', 'running', 0, 0, 0);

        try {
            $drives = self::listSharedDrives();
        } catch (Throwable $e) {
            self::updateSyncJob('shared_drives', 'failed', 0, 0, 0);
            throw $e;
        }
        $total = count($drives);
        self::updateSyncJob('shared_drives', 'running', $total, 0, 0);

        foreach ($drives as $drive) {
            $createdAt = $drive['created_at']
                ? date('Y-m-d H:i:s', strtotime($drive['created_at']))
                : null;

            try {
                // Preserve existing members_json/creator_email/domain if already synced
                $existing = Database::queryOne(
                    'SELECT creator_email, domain, member_count, members_json FROM shared_drives WHERE id = :id',
                    [':id' => $drive['id']]
                );
                Database::execute(
                    "INSERT INTO shared_drives (id, name, creator_email, domain, member_count, members_json, storage_mb, created_at, last_synced_at)
                     VALUES (:id, :name, :ce, :dom, :mc, :mj, 0, :ca, NOW())
                     ON DUPLICATE KEY UPDATE
                       name           = VALUES(name),
                       created_at     = VALUES(created_at),
                       last_synced_at = NOW()",
                    [
                        ':id'   => $drive['id'],
                        ':name' => $drive['name'],
                        ':ce'   => $existing['creator_email'] ?? '',
                        ':dom'  => $existing['domain'] ?? '',
                        ':mc'   => $existing['member_count'] ?? 0,
                        ':mj'   => $existing['members_json'] ?? '[]',
                        ':ca'   => $createdAt,
                    ]
                );
                $synced++;
            } catch (Throwable $e) {
                Logger::error("[GWS] upsert failed for {$drive['id']}: " . $e->getMessage());
                $errors++;
            }

            self::updateSyncJob('shared_drives', 'running', $total, $synced + $errors, $errors);
        }

        $duration = round(microtime(true) - $start, 1);
        Logger::info("[GWS] syncSharedDrivesToDb complete — synced: $synced, errors: $errors, duration: {$duration}s");

        self::updateSyncJob('shared_drives', 'done', $total, $synced + $errors, $errors);

        return ['synced' => $synced, 'errors' => $errors, 'duration_sec' => $duration];
    }

    /**
     * Sync members for all drives that have no members_json yet (or all drives if $forceAll=true).
     * Designed to run as a nightly cron — safe to timeout mid-way, resumes next run.
     */
    public static function syncMembersToDb(bool $forceAll = false, int $maxSeconds = 50): array
    {
        ini_set('memory_limit', '512M');
        $start = microtime(true);
        $synced = 0; $errors = 0;

        $where = $forceAll ? '1=1' : "(members_json IS NULL OR members_json = '[]' OR members_json = '')";
        $drives = Database::query("SELECT id, name FROM shared_drives WHERE $where ORDER BY id");

        $total = count($drives);
        self::updateSyncJob('shared_drives_members', 'running', $total, 0, 0);

        foreach ($drives as $i => $drive) {
            // Stop before Apache kills us — leave time for final DB write
            if ((microtime(true) - $start) >= $maxSeconds) {
                self::updateSyncJob('shared_drives_members', 'partial', $total, $synced + $errors, $errors);
                return ['synced' => $synced, 'errors' => $errors, 'duration_sec' => round(microtime(true) - $start, 1), 'remaining' => $total - $i];
            }
            $members = []; $membersJson = '[]'; $memberCount = 0;
            try {
                $members     = self::getSharedDriveMembers($drive['id']);
                $membersJson = json_encode($members);
                $memberCount = count($members);
            } catch (Throwable $e) {
                Logger::error("[GWS] syncMembers failed for {$drive['id']}: " . $e->getMessage());
                $errors++;
                self::updateSyncJob('shared_drives_members', 'running', count($drives), $i + 1, $errors);
                continue;
            }

            $creatorEmail = '';
            foreach ($members as $m) {
                if (($m['role'] ?? '') === 'organizer') { $creatorEmail = $m['email']; break; }
            }
            $domain = $creatorEmail && str_contains($creatorEmail, '@')
                ? strtolower(explode('@', $creatorEmail)[1]) : '';

            try {
                Database::execute(
                    "UPDATE shared_drives SET members_json=:mj, member_count=:mc, creator_email=:ce, domain=:dom WHERE id=:id",
                    [':mj' => $membersJson, ':mc' => $memberCount, ':ce' => $creatorEmail, ':dom' => $domain, ':id' => $drive['id']]
                );
                $synced++;
            } catch (Throwable $e) {
                Logger::error("[GWS] syncMembers update failed for {$drive['id']}: " . $e->getMessage());
                $errors++;
            }
            self::updateSyncJob('shared_drives_members', 'running', count($drives), $i + 1, $errors);
        }

        $duration = round(microtime(true) - $start, 1);
        self::updateSyncJob('shared_drives_members', 'done', count($drives), $synced + $errors, $errors);
        Logger::info("[GWS] syncMembersToDb complete — synced: $synced, errors: $errors, duration: {$duration}s");
        return ['synced' => $synced, 'errors' => $errors, 'duration_sec' => $duration];
    }

    /**
     * Sync storage_mb for all shared drives. One drives->get() call per drive.
     * Designed to run as a nightly cron after syncMembersToDb.
     */
    public static function syncStorageToDb(int $maxSeconds = 50): array
    {
        ini_set('memory_limit', '512M');
        $start = microtime(true);
        $synced = 0; $errors = 0;

        $driveService = self::getAdminDriveService();

        $drives = Database::query('SELECT id FROM shared_drives WHERE storage_mb = 0 ORDER BY id');
        $total = count($drives);
        self::updateSyncJob('shared_drives_storage', 'running', $total, 0, 0);

        foreach ($drives as $i => $drive) {
            if ((microtime(true) - $start) >= $maxSeconds) {
                self::updateSyncJob('shared_drives_storage', 'partial', $total, $synced + $errors, $errors);
                return ['synced' => $synced, 'errors' => $errors, 'duration_sec' => round(microtime(true) - $start, 1), 'remaining' => $total - $i];
            }
            try {
                // Fetch drive details — storageQuota not available via Drives API for shared drives
                // Use files.list to sum file sizes within the drive
                $driveService = self::getAdminDriveService();
                $totalBytes = 0;
                $pageToken = null;
                do {
                    $params = [
                        'driveId'                  => $drive['id'],
                        'includeItemsFromAllDrives' => true,
                        'supportsAllDrives'         => true,
                        'corpora'                  => 'drive',
                        'fields'                   => 'nextPageToken,files(size)',
                        'q'                        => 'trashed = false',
                        'pageSize'                 => 1000,
                    ];
                    if ($pageToken) $params['pageToken'] = $pageToken;
                    $result = $driveService->files->listFiles($params);
                    foreach ($result->getFiles() as $file) {
                        $totalBytes += (int)($file->getSize() ?? 0);
                    }
                    $pageToken = $result->getNextPageToken();
                } while ($pageToken);
                $storageMb = (int)round($totalBytes / 1048576);
                Database::execute(
                    'UPDATE shared_drives SET storage_mb = :sm WHERE id = :id',
                    [':sm' => $storageMb, ':id' => $drive['id']]
                );
                $synced++;
            } catch (Throwable $e) {
                Logger::error("[GWS] syncStorage failed for {$drive['id']}: " . $e->getMessage());
                $errors++;
            }
            self::updateSyncJob('shared_drives_storage', 'running', $total, $i + 1, $errors);
        }

        $duration = round(microtime(true) - $start, 1);
        self::updateSyncJob('shared_drives_storage', 'done', $total, $synced + $errors, $errors);
        Logger::info("[GWS] syncStorageToDb complete — synced: $synced, errors: $errors, duration: {$duration}s");
        return ['synced' => $synced, 'errors' => $errors, 'duration_sec' => $duration];
    }

    private static function getGmailService(string $userEmail): object
    {
        self::boot();
        $client = new Google_Client();
        $client->setApplicationName('LetsDoItSmartly');
        $client->setAuthConfig(GOOGLE_CREDENTIALS);
        $client->setScopes([
            'https://www.googleapis.com/auth/gmail.settings.sharing',
            'https://mail.google.com/',
        ]);
        $client->setSubject($userEmail);
        return new Google_Service_Gmail($client);
    }

    // ── Alias Management ──────────────────────────────────────────────────────

    public static function listAliases(string $email): array
    {
        try {
            $service = self::getService();
            $result  = $service->users_aliases->listUsersAliases($email);
            $aliases = [];
            foreach ($result->getAliases() ?? [] as $a) {
                if (is_array($a)) {
                    $aliases[] = ['alias' => $a['alias'] ?? '', 'primary_email' => $a['primaryEmail'] ?? ''];
                } else {
                    $aliases[] = ['alias' => $a->getAlias(), 'primary_email' => $a->getPrimaryEmail()];
                }
            }
            return $aliases;
        } catch (Throwable $e) {
            Logger::error("[GWS] listAliases FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    public static function addAlias(string $email, string $alias): bool
    {
        if (!self::isManaged($email)) return false;
        try {
            $service   = self::getService();
            $aliasObj  = new Google_Service_Directory_Alias();
            $aliasObj->setAlias($alias);
            $service->users_aliases->insert($email, $aliasObj);
            Logger::info("[GWS] addAlias OK → $email ← $alias");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] addAlias FAILED → $email ← $alias: " . $e->getMessage());
            throw $e;
        }
    }

    public static function removeAlias(string $email, string $alias): bool
    {
        if (!self::isManaged($email)) throw new \RuntimeException("$email is not a managed LDIS domain");
        try {
            $service = self::getService();
            $service->users_aliases->delete($email, $alias);
            Logger::info("[GWS] removeAlias OK → $email ← $alias");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] removeAlias FAILED → $email ← $alias: " . $e->getMessage());
            throw $e;
        }
    }

    // ── Email Forwarding ──────────────────────────────────────────────────────

    public static function getForwarding(string $email): array
    {
        try {
            $gmail   = self::getGmailService($email);
            $result  = $gmail->users_settings->getAutoForwarding($email);
            return [
                'enabled'      => (bool) $result->getEnabled(),
                'forward_to'   => (string) ($result->getEmailAddress() ?? ''),
                'disposition'  => (string) ($result->getDisposition() ?? 'leaveInInbox'),
            ];
        } catch (Throwable $e) {
            Logger::error("[GWS] getForwarding FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    public static function setForwarding(string $email, bool $enabled, string $forwardTo = '', string $disposition = 'leaveInInbox'): bool
    {
        if (!self::isManaged($email)) return false;
        try {
            $gmail   = self::getGmailService($email);
            $setting = new Google_Service_Gmail_AutoForwarding();
            $setting->setEnabled($enabled);
            if ($enabled && $forwardTo) {
                $setting->setEmailAddress($forwardTo);
                $setting->setDisposition($disposition); // leaveInInbox | archive | trash | markRead
            }
            $gmail->users_settings->updateAutoForwarding($email, $setting);
            Logger::info("[GWS] setForwarding OK → $email enabled=$enabled forwardTo=$forwardTo");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] setForwarding FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    // ── 2SV Backup Codes ──────────────────────────────────────────────────────

    public static function listBackupCodes(string $email): array
    {
        try {
            $service = self::getService();
            $result  = $service->verificationCodes->listVerificationCodes($email);
            $codes   = [];
            foreach ($result->getItems() ?? [] as $item) {
                $codes[] = $item->getVerificationCode();
            }
            return $codes;
        } catch (Throwable $e) {
            Logger::error("[GWS] listBackupCodes FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    public static function generateBackupCodes(string $email): bool
    {
        if (!self::isManaged($email)) return false;
        try {
            $service = self::getService();
            $service->verificationCodes->generate($email);
            Logger::info("[GWS] generateBackupCodes OK → $email");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] generateBackupCodes FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    public static function invalidateBackupCodes(string $email): bool
    {
        if (!self::isManaged($email)) return false;
        try {
            $service = self::getService();
            $service->verificationCodes->invalidate($email);
            Logger::info("[GWS] invalidateBackupCodes OK → $email");
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] invalidateBackupCodes FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    // ── OOO / Vacation Responder ──────────────────────────────────────────────

    public static function getVacation(string $email): array
    {
        try {
            $gmail  = self::getGmailService($email);
            $result = $gmail->users_settings->getVacation($email);
            return [
                'enabled'          => (bool) $result->getEnableAutoReply(),
                'subject'          => (string) ($result->getResponseSubject() ?? ''),
                'body'             => (string) ($result->getResponseBodyPlainText() ?? ''),
                'start_time_epoch' => $result->getStartTime() ? (int)($result->getStartTime() / 1000) : null,
                'end_time_epoch'   => $result->getEndTime()   ? (int)($result->getEndTime()   / 1000) : null,
            ];
        } catch (Throwable $e) {
            Logger::error("[GWS] getVacation FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    public static function setVacation(string $email, array $data): bool
    {
        if (!self::isManaged($email)) return false;
        try {
            $gmail   = self::getGmailService($email);
            $setting = new Google_Service_Gmail_VacationSettings();
            $setting->setEnableAutoReply((bool) ($data['enabled'] ?? false));
            if (!empty($data['subject'])) $setting->setResponseSubject($data['subject']);
            if (!empty($data['body']))    $setting->setResponseBodyPlainText($data['body']);
            if (!empty($data['start_time_epoch'])) $setting->setStartTime((int)$data['start_time_epoch'] * 1000);
            if (!empty($data['end_time_epoch']))   $setting->setEndTime((int)$data['end_time_epoch'] * 1000);
            $gmail->users_settings->updateVacation($email, $setting);
            Logger::info("[GWS] setVacation OK → $email enabled=" . ($data['enabled'] ? 'true' : 'false'));
            return true;
        } catch (Throwable $e) {
            Logger::error("[GWS] setVacation FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Permanently delete a user from Google Admin.
     * ONLY called by the 30-day hard-delete cron — never by user-facing actions.
     * Guarded by isManaged() — will never touch WMD or non-LDIS users.
     */
    public static function deleteUser(string $email): bool
    {
        if (!self::isManaged($email)) {
            Logger::error("[GWS] deleteUser BLOCKED — $email is not a managed LDIS domain");
            return false;
        }
        try {
            $service = self::getService();
            $service->users->delete($email);
            Logger::info("[GWS] deleteUser OK → $email (permanent)");
            return true;
        } catch (Throwable $e) {
            // 404 = already deleted in Google — still mark as deleted in DB
            if (str_contains($e->getMessage(), '404') || str_contains($e->getMessage(), 'Resource Not Found')) {
                Logger::info("[GWS] deleteUser → $email already gone from Google (404), marking deleted in DB");
                return true;
            }
            Logger::error("[GWS] deleteUser FAILED → $email: " . $e->getMessage());
            throw $e;
        }
    }
}
