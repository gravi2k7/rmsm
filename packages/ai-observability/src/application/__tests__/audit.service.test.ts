import { describe, it, expect, beforeEach } from "vitest";
import { AuditService } from "../services/audit.service";
import { FixedClock, SequentialIdGenerator, makeAuditEntryRepository } from "./fakes";
import type { AuditEntryRepository } from "../services/audit.service";

describe("AuditService", () => {
  let auditEntryRepository: AuditEntryRepository;
  let service: AuditService;

  beforeEach(() => {
    auditEntryRepository = makeAuditEntryRepository();
    service = new AuditService(auditEntryRepository, new FixedClock(new Date("2026-01-01T00:00:00.000Z")), new SequentialIdGenerator());
  });

  it("records an audit entry", async () => {
    const entry = await service.record("req-1", "RequestFailed", "provider timeout");
    expect(entry.requestId).toBe("req-1");
    expect(entry.action).toBe("RequestFailed");
  });

  it("returns audit history scoped to a requestId", async () => {
    await service.record("req-1", "A", "detail a");
    await service.record("req-2", "B", "detail b");

    const history = await service.getHistory("req-1");
    expect(history).toHaveLength(1);
    expect(history[0]?.action).toBe("A");
  });
});
