import type { AuditEntry } from "../domain/entities/audit-entry.entity";

export interface AuditRepository {
  record(entry: AuditEntry): Promise<void>;
  listByActor(actorId: string): Promise<readonly AuditEntry[]>;
}
