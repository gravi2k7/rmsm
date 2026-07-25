import { describe, expect, it } from "vitest";
import { InMemoryApprovalRequestRepository } from "../in-memory-approval-request.repository";
import { ApprovalStatus } from "../../domain/enums/hitl.enum";

describe("InMemoryApprovalRequestRepository", () => {
  it("saves, finds, and lists requests scoped to a queue and status", async () => {
    const repo = new InMemoryApprovalRequestRepository();
    await repo.save({ id: "r1", agentId: "a1", queueName: "ops", subject: "delete resource", context: {}, status: ApprovalStatus.PENDING, requestedAt: new Date(), resolvedAt: null });
    await repo.save({ id: "r2", agentId: "a1", queueName: "ops", subject: "publish report", context: {}, status: ApprovalStatus.APPROVED, requestedAt: new Date(), resolvedAt: new Date() });
    await repo.save({ id: "r3", agentId: "a1", queueName: "other", subject: "x", context: {}, status: ApprovalStatus.PENDING, requestedAt: new Date(), resolvedAt: null });

    expect((await repo.findById("r1"))?.subject).toBe("delete resource");
    expect(await repo.listByQueue("ops")).toHaveLength(2);
    expect(await repo.listByQueue("ops", ApprovalStatus.PENDING)).toHaveLength(1);
    expect(await repo.findById("missing")).toBeNull();
  });
});
