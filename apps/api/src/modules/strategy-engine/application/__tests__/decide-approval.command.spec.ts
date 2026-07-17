import { DecideApprovalHandler, DecideApprovalCommand } from "../commands/decide-approval.command";
import { StrategyApproval } from "../../domain/entities/strategy-approval.entity";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { StrategyVersionNotFoundException, NoPendingApprovalException } from "../errors/application.errors";
import type { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import type { StrategyApprovalRepository } from "../../infrastructure/repositories/strategy-approval.repository";
import type { HistoryRecorderService } from "../services/history-recorder.service";

function buildVersion(): StrategyVersion {
  const empty = new RuleGroup("g", "AND", []);
  return new StrategyVersion("ver1", "strat1", 1, "PENDING_APPROVAL", empty, empty, [], "user1", new Date());
}

function buildHandler() {
  const versionRepository = { findById: jest.fn(), save: jest.fn() } as unknown as StrategyVersionRepository;
  const approvalRepository = { findPendingByStrategyVersion: jest.fn(), save: jest.fn() } as unknown as StrategyApprovalRepository;
  const historyRecorder = { record: jest.fn() } as unknown as HistoryRecorderService;
  return { handler: new DecideApprovalHandler(versionRepository, approvalRepository, historyRecorder), versionRepository, approvalRepository, historyRecorder };
}

describe("DecideApprovalHandler — one handler covering both Approve and Reject", () => {
  it("APPROVED decision transitions the version to APPROVED and records the real decision", async () => {
    const { handler, versionRepository, approvalRepository } = buildHandler();
    const version = buildVersion();
    (versionRepository.findById as jest.Mock).mockResolvedValue(version);
    (approvalRepository.findPendingByStrategyVersion as jest.Mock).mockResolvedValue(new StrategyApproval("appr1", "ver1", "requester1", new Date(), "PENDING"));

    const decided = await handler.execute(new DecideApprovalCommand("org1", "ver1", "APPROVED", "approver1", "Looks good"));

    expect(version.status).toBe("APPROVED");
    expect(decided.decision).toBe("APPROVED");
    expect(decided.decidedByUserId).toBe("approver1");
    expect(decided.comments).toBe("Looks good");
  });

  it("REJECTED decision transitions the version to REJECTED — the SAME handler, a different outcome, not a different code path", async () => {
    const { handler, versionRepository, approvalRepository } = buildHandler();
    const version = buildVersion();
    (versionRepository.findById as jest.Mock).mockResolvedValue(version);
    (approvalRepository.findPendingByStrategyVersion as jest.Mock).mockResolvedValue(new StrategyApproval("appr1", "ver1", "requester1", new Date(), "PENDING"));

    const decided = await handler.execute(new DecideApprovalCommand("org1", "ver1", "REJECTED", "approver1"));

    expect(version.status).toBe("REJECTED");
    expect(decided.decision).toBe("REJECTED");
  });

  it("throws NoPendingApprovalException when there's no pending approval to decide", async () => {
    const { handler, versionRepository, approvalRepository } = buildHandler();
    (versionRepository.findById as jest.Mock).mockResolvedValue(buildVersion());
    (approvalRepository.findPendingByStrategyVersion as jest.Mock).mockResolvedValue(null);

    await expect(handler.execute(new DecideApprovalCommand("org1", "ver1", "APPROVED", "approver1"))).rejects.toThrow(NoPendingApprovalException);
  });

  it("throws StrategyVersionNotFoundException for a nonexistent version", async () => {
    const { handler, versionRepository } = buildHandler();
    (versionRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(handler.execute(new DecideApprovalCommand("org1", "missing", "APPROVED", "approver1"))).rejects.toThrow(StrategyVersionNotFoundException);
  });

  it("preserves the ORIGINAL request's own requestedByUserId/requestedAt on the decided approval — only the decision fields change", async () => {
    const { handler, versionRepository, approvalRepository } = buildHandler();
    const requestedAt = new Date("2026-01-01T00:00:00Z");
    (versionRepository.findById as jest.Mock).mockResolvedValue(buildVersion());
    (approvalRepository.findPendingByStrategyVersion as jest.Mock).mockResolvedValue(new StrategyApproval("appr1", "ver1", "original-requester", requestedAt, "PENDING"));

    const decided = await handler.execute(new DecideApprovalCommand("org1", "ver1", "APPROVED", "approver1"));

    expect(decided.requestedByUserId).toBe("original-requester");
    expect(decided.requestedAt).toBe(requestedAt);
  });
});
