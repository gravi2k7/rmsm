import type { AuditRepository } from "../repositories/audit-repository.interface";
import type { AuditEntry } from "../domain/entities/audit-entry.entity";

export class InMemoryAuditRepository implements AuditRepository {
  private readonly entries: AuditEntry[] = [];

  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async listByActor(actorId: string): Promise<readonly AuditEntry[]> {
    return this.entries.filter((e) => e.actorId === actorId);
  }
}
