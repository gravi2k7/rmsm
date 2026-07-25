import type { Clock, IdGenerator } from "@rmsm/core";
import type { AuditEntry } from "../../domain/entities/audit-entry.entity";

/** Append-only audit trail port + default in-memory-backed service.
 * Kept separate from `TraceRepository`/`MetricsRepository` because an
 * audit entry is coarser-grained and human-readable by design (e.g.
 * "request req-1 failed after 3 retries"), not a structured metric. */
export interface AuditEntryRepository {
  save(entry: AuditEntry): Promise<void>;
  findByRequestId(requestId: string): Promise<readonly AuditEntry[]>;
}

export class AuditService {
  constructor(
    private readonly auditEntryRepository: AuditEntryRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async record(requestId: string, action: string, detail: string): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: this.idGenerator.generate(),
      requestId,
      action,
      detail,
      occurredAt: this.clock.now(),
    };
    await this.auditEntryRepository.save(entry);
    return entry;
  }

  async getHistory(requestId: string): Promise<readonly AuditEntry[]> {
    return this.auditEntryRepository.findByRequestId(requestId);
  }
}
