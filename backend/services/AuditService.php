<?php
declare(strict_types=1);

class AuditService
{
    public static function log(
        string $action,
        string $actorType,   // 'staff' | 'portal'
        ?int   $actorId      = null,
        string $actorName    = '',
        string $actorRole    = '',
        string $target       = '',
        string $detail       = '',
        ?string $ip          = null
    ): void {
        try {
            Database::insert(
                'INSERT INTO audit_log
                 (actor_type, actor_id, actor_name, actor_role, action, target, detail, ip_address, created_at)
                 VALUES (:actor_type, :actor_id, :actor_name, :actor_role, :action, :target, :detail, :ip, NOW())',
                [
                    ':actor_type' => $actorType,
                    ':actor_id'   => $actorId,
                    ':actor_name' => $actorName,
                    ':actor_role' => $actorRole,
                    ':action'     => $action,
                    ':target'     => $target,
                    ':detail'     => $detail,
                    ':ip'         => $ip,
                ]
            );
        } catch (Throwable $e) {
            Logger::warn('[AuditService] Failed to write audit log: ' . $e->getMessage());
        }
    }
}
