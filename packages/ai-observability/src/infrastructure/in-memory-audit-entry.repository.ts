import type { AuditEntryRepository } from "../application/services/audit.service";
import type { AuditEntry } from "../domain/entities/audit-entry.entity";

export class InMemoryAuditEntryRepository implements AuditEntryRepository {
  private readonly entries: AuditEntry[] = [];

  async save(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByRequestId(requestId: string): Promise<readonly AuditEntry[]> {
    return this.entries.filter((entry) => entry.requestId === requestId);
  }
}
