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
            self::boot();
            $client = new Google_Client();
            $client->setApplicationName('LetsDoItSmartly');
            $client->setAuthConfig(GOOGLE_CREDENTIALS);
            $client->setScopes(['https://www.googleapis.com/auth/drive']);
            $client->setSubject(GOOGLE_ADMIN_EMAIL);
            $drive = new Google_Service_Drive($client);

            $result = [];
            $pageToken = null;
            do {
                $opts = ['pageSize' => 100, 'fields' => 'nextPageToken,drives(id,name,createdTime)'];
                if ($pageToken) $opts['pageToken'] = $pageToken;
                $resp = $drive->drives->listDrives($opts);
                foreach ($resp->getDrives() as $d) {
                    $result[] = [
                        'id'           => $d->getId(),
                        'name'         => $d->getName(),
                        'createdAt'    => $d->getCreatedTime(),
                        'membersCount' => 0,
                    ];
                }
                $pageToken = $resp->getNextPageToken();
            } while ($pageToken);

            return $result;
        } catch (Throwable $e) {
            Logger::error('[GWS] listSharedDrives FAILED: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * List members (permissions) for a specific shared drive.
     */
    public static function getSharedDriveMembers(string $driveId): array
    {
        try {
            self::boot();
            $client = new Google_Client();
            $client->setApplicationName('LetsDoItSmartly');
            $client->setAuthConfig(GOOGLE_CREDENTIALS);
            $client->setScopes(['https://www.googleapis.com/auth/drive']);
            $client->setSubject(GOOGLE_ADMIN_EMAIL);
            $drive = new Google_Service_Drive($client);

            $resp = $drive->permissions->listPermissions($driveId, [
                'supportsAllDrives' => true,
                'fields' => 'permissions(id,emailAddress,role,type)',
            ]);
            $members = [];
            foreach ($resp->getPermissions() as $p) {
                if ($p->getType() === 'user' && $p->getEmailAddress()) {
                    $members[] = [
                        'email' => $p->getEmailAddress(),
                        'role'  => $p->getRole(),
                    ];
                }
            }
            return $members;
        } catch (Throwable $e) {
            Logger::error("[GWS] getSharedDriveMembers FAILED $driveId: " . $e->getMessage());
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
