import { describe, expect, it } from "vitest";
import { ApprovalService } from "../services/approval.service";
import { ReviewQueueService } from "../services/review-queue.service";
import { DecisionRecordService } from "../services/decision-record.service";
import { InMemoryApprovalRequestRepository } from "../../infrastructure/in-memory-approval-request.repository";
import { InMemoryDecisionRecordRepository } from "../../infrastructure/in-memory-decision-record.repository";
import { ApprovalStatus } from "../../domain/enums/hitl.enum";
import { ApprovalRequestNotFoundError, ApprovalAlreadyResolvedError } from "../../domain/errors/hitl-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildServices(events?: RecordingEventPublisher) {
  const requestRepository = new InMemoryApprovalRequestRepository();
  const decisionRepository = new InMemoryDecisionRecordRepository();
  const approvals = new ApprovalService(requestRepository, decisionRepository, new FixedClock(), new SequentialIdGenerator(), events);
  const queue = new ReviewQueueService(requestRepository);
  const decisions = new DecisionRecordService(decisionRepository);
  return { approvals, queue, decisions };
}

describe("ApprovalService + ReviewQueueService + DecisionRecordService", () => {
  it("requests an approval and lists it in its queue while pending", async () => {
    const { approvals, queue } = buildServices();
    const request = await approvals.requestApproval("agent-1", "ops", "delete resource X");

    expect(request.status).toBe(ApprovalStatus.PENDING);
    expect((await queue.listPending("ops")).map((r) => r.id)).toEqual([request.id]);
  });

  it("approves a request, records a decision, and removes it from the pending queue", async () => {
    const events = new RecordingEventPublisher();
    const { approvals, queue, decisions } = buildServices(events);
    const request = await approvals.requestApproval("agent-1", "ops", "delete resource X");

    const resolved = await approvals.approve(request.id, "reviewer-1", "looks safe");
    expect(resolved.status).toBe(ApprovalStatus.APPROVED);
    expect(await queue.listPending("ops")).toEqual([]);

    const records = await decisions.listForSubject(request.id);
    expect(records).toHaveLength(1);
    expect(records[0]?.decision).toBe("APPROVED");

    expect(events.published.map((e) => e.kind)).toEqual(["ApprovalRequested", "DecisionRecorded", "ApprovalGranted"]);
  });

  it("rejects a request and records the decision", async () => {
    const { approvals, decisions } = buildServices();
    const request = await approvals.requestApproval("agent-1", "ops", "delete resource X");
    const resolved = await approvals.reject(request.id, "reviewer-1", "too risky");

    expect(resolved.status).toBe(ApprovalStatus.REJECTED);
    expect((await decisions.listForSubject(request.id))[0]?.decision).toBe("REJECTED");
  });

  it("escalates a pending request without resolving it, and lists it under the escalated queue view", async () => {
    const { approvals, queue } = buildServices();
    const request = await approvals.requestApproval("agent-1", "ops", "delete resource X");
    const escalated = await approvals.escalate(request.id, "senior-reviewer", "needs a second opinion");

    expect(escalated.status).toBe(ApprovalStatus.ESCALATED);
    expect((await queue.listEscalated("ops")).map((r) => r.id)).toEqual([request.id]);
  });

  it("rejects approving/rejecting an already-resolved request", async () => {
    const { approvals } = buildServices();
    const request = await approvals.requestApproval("agent-1", "ops", "delete resource X");
    await approvals.approve(request.id, "reviewer-1");

    await expect(approvals.approve(request.id, "reviewer-2")).rejects.toThrow(ApprovalAlreadyResolvedError);
    await expect(approvals.reject(request.id, "reviewer-2")).rejects.toThrow(ApprovalAlreadyResolvedError);
  });

  it("throws ApprovalRequestNotFoundError for an unknown request id", async () => {
    const { approvals } = buildServices();
    await expect(approvals.getRequest("missing")).rejects.toThrow(ApprovalRequestNotFoundError);
  });
});
