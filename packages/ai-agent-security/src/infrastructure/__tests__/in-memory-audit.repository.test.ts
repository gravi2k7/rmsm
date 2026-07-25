import { describe, expect, it } from "vitest";
import { InMemoryAuditRepository } from "../in-memory-audit.repository";

describe("InMemoryAuditRepository", () => {
  it("records and lists entries scoped to one actor", async () => {
    const repo = new InMemoryAuditRepository();
    await repo.record({ id: "e1", actorId: "agent-1", action: "delete", resource: "res-1", decision: "DENY", reason: "no permission", occurredAt: new Date() });
    await repo.record({ id: "e2", actorId: "agent-2", action: "read", resource: "res-1", decision: "ALLOW", reason: "granted", occurredAt: new Date() });

    expect(await repo.listByActor("agent-1")).toHaveLength(1);
    expect(await repo.listByActor("agent-2")).toHaveLength(1);
  });
});
