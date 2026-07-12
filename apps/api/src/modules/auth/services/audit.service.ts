import { Injectable } from "@nestjs/common";
import { AuditLogRepository } from "../repositories/audit-log.repository";
import type { AuditLog, Prisma } from "@rmsm/database";

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Converts an arbitrary metadata record into a Prisma-safe JSON value.
 *
 * `Record<string, unknown>` is not structurally assignable to
 * `Prisma.InputJsonValue` — `unknown` values could be functions, `Date`
 * instances, `undefined`, symbols, etc., none of which are valid JSON. A
 * bare `as Prisma.InputJsonValue` cast would silence the type error without
 * guaranteeing that at runtime. Round-tripping through JSON.stringify /
 * JSON.parse is the correct conversion: it actually strips or coerces
 * every non-JSON-safe value the same way Postgres's `jsonb` column would,
 * so the cast on the final line is backed by a real runtime guarantee
 * rather than just asserting the type away.
 */
function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Every security-sensitive operation writes here — registration, login
 * (success and failure), password changes, role grants, session revocation,
 * 2FA enable/disable, OAuth linking. This is the single write path for
 * AuditLog so entries are never partially/inconsistently formatted.
 */
@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  log(
    action: string,
    opts: {
      userId?: string | null;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    } & AuditContext = {},
  ): Promise<AuditLog> {
    return this.auditLogRepository.create({
      action,
      userId: opts.userId ?? null,
      entityType: opts.entityType,
      entityId: opts.entityId,
      metadata: toInputJsonValue(opts.metadata ?? {}),
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  }
}
