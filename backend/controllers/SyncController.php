<?php
declare(strict_types=1);

/**
 * SyncController — Import all users from Google Workspace into workspace_users.
 *
 * POST /api/admin/sync-google
 *   Fetches ALL users across all domains (customer=my_customer).
 *   Auto-creates billing_entities and domains for any new domain discovered.
 *
 * OU → plan_slug mapping (last segment of OU path):
 *   b   → basic
 *   p   → pro
 *   e   → enterprise
 *   pre → premium
 *   anything else → basic (safe default)
 *
 * Billing entity / domain auto-creation:
 *   - Domain is extracted from user's email (e.g. abc.com)
 *   - OU structure: /defaultOU/{slug}/b|p|e|pre  — slug becomes company slug
 *   - If domain not in DB: create billing_entity (name = domain, slug = sanitised domain)
 *     and domain record, then proceed to upsert users
 *
 * Access: super_admin only.
 */
class SyncController
{
    private static array $ouSuffixMap = [
        'b'   => 'basic',
        'p'   => 'pro',
        'e'   => 'enterprise',
        'pre' => 'premium',
    ];

    public function syncGoogle(Request $req): void
    {
        $stats = ['domains_discovered' => 0, 'domains_new' => 0, 'inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

        // Fetch ALL users from Google Workspace in one pass
        $allUsers = GoogleWorkspaceService::listAllUsers();

        if (empty($allUsers)) {
            Response::json(['message' => 'No users returned from Google Workspace. Check service account delegation.', 'stats' => $stats]);
            return;
        }

        // Group by domain
        $byDomain = [];
        foreach ($allUsers as $gu) {
            $email = $gu['email'];
            if (!$email || !str_contains($email, '@')) { $stats['skipped']++; continue; }
            $domain = strtolower(substr($email, strpos($email, '@') + 1));
            $byDomain[$domain][] = $gu;
        }

        $stats['domains_discovered'] = count($byDomain);

        // Load existing domain records once
        $domainRows = Database::query('SELECT d.*, be.id AS billing_entity_id FROM domains d JOIN billing_entities be ON be.id = d.billing_entity_id WHERE d.is_active = 1', []);
        $domainMap  = []; // domain name → row
        foreach ($domainRows as $dr) {
            $domainMap[$dr['name']] = $dr;
        }

        foreach ($byDomain as $domainName => $users) {
            // Auto-create billing entity + domain if not known
            if (!isset($domainMap[$domainName])) {
                try {
                    [$beId, $domainId, $ouPath] = self::autoCreateDomain($domainName, $users);
                    $domainMap[$domainName] = ['id' => $domainId, 'billing_entity_id' => $beId, 'ou_path' => $ouPath, 'name' => $domainName];
                    $stats['domains_new']++;
                } catch (Throwable $e) {
                    Logger::error("[Sync] Auto-create failed for $domainName: " . $e->getMessage());
                    $stats['errors'][] = ['domain' => $domainName, 'error' => 'auto-create: ' . $e->getMessage()];
                    continue;
                }
            }

            $dr = $domainMap[$domainName];

            foreach ($users as $gu) {
                $email = strtolower($gu['email']);
                $planSlug = self::inferPlan($gu['ouPath'] ?? '');

                $firstName = $gu['firstName'] ?? '';
                $lastName  = $gu['lastName']  ?? '';
                if (!$firstName && !$lastName) {
                    $firstName = explode('@', $email)[0];
                }

                $lastLogin     = $gu['lastLogin']  ? date('Y-m-d H:i:s', strtotime($gu['lastLogin']))  : null;
                $googleCreated = $gu['createdAt']  ? date('Y-m-d H:i:s', strtotime($gu['createdAt']))  : null;
                $status        = $gu['suspended']  ? 'suspended' : 'active';

                $existing = Database::queryOne('SELECT id FROM workspace_users WHERE email = :email', [':email' => $email]);

                try {
                    if ($existing) {
                        Database::execute(
                            'UPDATE workspace_users SET
                               domain_id = :did, billing_entity_id = :beid,
                               first_name = :fn, last_name = :ln,
                               plan_slug = :plan, ou_path = :ou,
                               status = :status, two_sv_enabled = :tsv,
                               last_login_at = :ll, google_created_at = :gc,
                               created_via_portal = 0
                             WHERE id = :id',
                            [
                                ':did'    => $dr['id'],
                                ':beid'   => $dr['billing_entity_id'],
                                ':fn'     => $firstName,
                                ':ln'     => $lastName,
                                ':plan'   => $planSlug,
                                ':ou'     => $gu['ouPath'] ?? '',
                                ':status' => $status,
                                ':tsv'    => (int) ($gu['twoSVEnabled'] ?? false),
                                ':ll'     => $lastLogin,
                                ':gc'     => $googleCreated,
                                ':id'     => $existing['id'],
                            ]
                        );
                        $stats['updated']++;
                    } else {
                        Database::execute(
                            'INSERT INTO workspace_users
                               (domain_id, billing_entity_id, first_name, last_name, email,
                                plan_slug, ou_path, status, two_sv_enabled, last_login_at,
                                google_created_at, created_via_portal)
                             VALUES (:did, :beid, :fn, :ln, :email,
                                     :plan, :ou, :status, :tsv, :ll, :gc, 0)',
                            [
                                ':did'    => $dr['id'],
                                ':beid'   => $dr['billing_entity_id'],
                                ':fn'     => $firstName,
                                ':ln'     => $lastName,
                                ':email'  => $email,
                                ':plan'   => $planSlug,
                                ':ou'     => $gu['ouPath'] ?? '',
                                ':status' => $status,
                                ':tsv'    => (int) ($gu['twoSVEnabled'] ?? false),
                                ':ll'     => $lastLogin,
                                ':gc'     => $googleCreated,
                            ]
                        );
                        $stats['inserted']++;
                    }
                } catch (Throwable $e) {
                    Logger::error("[Sync] User $email failed: " . $e->getMessage());
                    $stats['errors'][] = ['email' => $email, 'error' => $e->getMessage()];
                }
            }
        }

        AuditService::log(
            'GOOGLE_SYNC', 'staff', $req->user['userId'], $req->user['name'] ?? '', $req->user['role'],
            'all_domains', json_encode($stats), $req->ip
        );

        Logger::info("[Sync] Google sync complete — " . json_encode($stats));
        Response::json(['message' => 'Sync complete.', 'stats' => $stats]);
    }

    /**
     * Auto-create a billing_entity + domain record for a newly discovered domain.
     * Uses the OU path to derive a slug (e.g. /defaultOU/abc/b → slug=abc).
     * Returns [billing_entity_id, domain_id, ou_path].
     */
    private static function autoCreateDomain(string $domainName, array $users): array
    {
        // Derive slug from first user's OU path: /defaultOU/{slug}/b → slug
        $ouPath  = '';
        $slug    = '';
        foreach ($users as $u) {
            if (!empty($u['ouPath'])) {
                $ouPath = $u['ouPath'];
                $parts  = array_values(array_filter(explode('/', $ouPath)));
                // Expected: defaultOU / {slug} / {plan_suffix}
                // Take segment index 1 as the company slug
                if (count($parts) >= 2) {
                    $slug = preg_replace('/[^a-z0-9_-]/', '', strtolower($parts[1]));
                }
                if ($slug) break;
            }
        }
        if (!$slug) {
            $slug = preg_replace('/[^a-z0-9_-]/', '', strtolower(explode('.', $domainName)[0]));
        }

        // The domain's base OU path is /defaultOU/{slug}
        $domainOuPath = '/defaultOU/' . $slug;

        // Reuse existing billing entity if same slug already exists (multi-domain client)
        $existingBe = Database::queryOne('SELECT id FROM billing_entities WHERE slug = :slug', [':slug' => $slug]);
        if ($existingBe) {
            $beId = $existingBe['id'];
        } else {
            $beId = Database::insert(
                'INSERT INTO billing_entities (name, slug, contact_email, renewal_date, auto_suspend)
                 VALUES (:name, :slug, :email, DATE_ADD(NOW(), INTERVAL 1 YEAR), 0)',
                [':name' => $domainName, ':slug' => $slug, ':email' => 'admin@' . $domainName]
            );
        }

        // Create domain
        $domainId = Database::insert(
            'INSERT INTO domains (billing_entity_id, name, ou_path, is_active)
             VALUES (:be, :name, :ou, 1)',
            [':be' => $beId, ':name' => $domainName, ':ou' => $domainOuPath]
        );

        Logger::info("[Sync] Auto-created billing entity '$domainName' (slug=$slug, beId=$beId) and domain '$domainName' (id=$domainId)");

        return [$beId, $domainId, $domainOuPath];
    }

    private static function inferPlan(string $ouPath): string
    {
        if (!$ouPath) return 'basic';
        $parts  = array_filter(explode('/', $ouPath));
        $suffix = strtolower(end($parts) ?: '');
        return self::$ouSuffixMap[$suffix] ?? 'basic';
    }
}
