import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAuditEntryRepository } from "../in-memory-audit-entry.repository";

describe("InMemoryAuditEntryRepository", () => {
  let repository: InMemoryAuditEntryRepository;

  beforeEach(() => {
    repository = new InMemoryAuditEntryRepository();
  });

  it("saves and finds entries scoped by requestId", async () => {
    await repository.save({ id: "a1", requestId: "req-1", action: "X", detail: "d", occurredAt: new Date() });
    await repository.save({ id: "a2", requestId: "req-2", action: "Y", detail: "d", occurredAt: new Date() });

    const entries = await repository.findByRequestId("req-1");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("a1");
  });
});
