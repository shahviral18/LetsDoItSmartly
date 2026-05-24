<?php
declare(strict_types=1);

/**
 * SyncController — Import / sync users from Google Admin into workspace_users.
 *
 * POST /api/admin/sync-google
 *   Body: { domain_id?: int }  — if omitted, syncs ALL active domains
 *
 * OU → plan_slug mapping (defaultOU/{slug}/b|p|e|pre or similar):
 *   last segment "b"   → basic
 *   last segment "p"   → pro
 *   last segment "e"   → enterprise
 *   last segment "pre" → premium
 *   anything else      → basic (safe default)
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
        $domainId = isset($req->body['domain_id']) ? (int) $req->body['domain_id'] : null;

        // Fetch domains to sync
        if ($domainId) {
            $domains = Database::query(
                'SELECT d.*, be.id AS billing_entity_id FROM domains d
                 JOIN billing_entities be ON be.id = d.billing_entity_id
                 WHERE d.id = :id AND d.is_active = 1',
                [':id' => $domainId]
            );
            if (!$domains) Response::error('Domain not found.', 404);
        } else {
            $domains = Database::query(
                'SELECT d.*, be.id AS billing_entity_id FROM domains d
                 JOIN billing_entities be ON be.id = d.billing_entity_id
                 WHERE d.is_active = 1 ORDER BY d.name'
            );
        }

        $stats = ['domains' => 0, 'inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

        foreach ($domains as $domain) {
            $stats['domains']++;
            try {
                $googleUsers = GoogleWorkspaceService::listDomainUsers($domain['name']);

                foreach ($googleUsers as $gu) {
                    $email = strtolower($gu['email']);
                    if (!$email) { $stats['skipped']++; continue; }

                    // Infer plan from OU path
                    $planSlug = self::inferPlan($gu['ouPath'] ?? '');

                    // Parse names
                    $firstName = $gu['firstName'] ?? '';
                    $lastName  = $gu['lastName']  ?? '';
                    if (!$firstName && !$lastName) {
                        $parts     = explode('@', $email);
                        $firstName = $parts[0];
                    }

                    // Parse dates
                    $lastLogin   = $gu['lastLogin']  ? date('Y-m-d H:i:s', strtotime($gu['lastLogin']))  : null;
                    $googleCreated = $gu['createdAt'] ? date('Y-m-d H:i:s', strtotime($gu['createdAt'])) : null;

                    $status = $gu['suspended'] ? 'suspended' : 'active';

                    $existing = Database::queryOne(
                        'SELECT id FROM workspace_users WHERE email = :email',
                        [':email' => $email]
                    );

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
                                ':did'    => $domain['id'],
                                ':beid'   => $domain['billing_entity_id'],
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
                                ':did'    => $domain['id'],
                                ':beid'   => $domain['billing_entity_id'],
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
                }
            } catch (Throwable $e) {
                Logger::error("[Sync] Domain {$domain['name']} failed: " . $e->getMessage());
                $stats['errors'][] = ['domain' => $domain['name'], 'error' => $e->getMessage()];
            }
        }

        AuditService::log(
            'GOOGLE_SYNC', 'staff', $req->user['userId'], $req->user['name'] ?? '', $req->user['role'],
            $domainId ? "domain:{$domainId}" : 'all_domains',
            json_encode($stats),
            $req->ip
        );

        Logger::info("[Sync] Google sync complete — " . json_encode($stats));
        Response::json(['message' => 'Sync complete.', 'stats' => $stats]);
    }

    private static function inferPlan(string $ouPath): string
    {
        if (!$ouPath) return 'basic';
        $parts  = array_filter(explode('/', $ouPath));
        $suffix = strtolower(end($parts) ?: '');
        return self::$ouSuffixMap[$suffix] ?? 'basic';
    }
}
