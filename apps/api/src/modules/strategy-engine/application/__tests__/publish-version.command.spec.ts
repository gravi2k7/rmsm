import { PublishVersionHandler, PublishVersionCommand } from "../commands/publish-version.command";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { StrategyNotFoundException, StrategyVersionNotFoundException, VersionNotApprovedException } from "../errors/application.errors";
import type { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import type { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import type { StrategyPublicationRepository } from "../../infrastructure/repositories/strategy-publication.repository";
import type { HistoryRecorderService } from "../services/history-recorder.service";
import type { EventPublisher } from "../events/event-publisher.interface";

function buildVersion(id: string, status: StrategyVersion["status"]): StrategyVersion {
  const empty = new RuleGroup("g", "AND", []);
  return new StrategyVersion(id, "strat1", 1, status, empty, empty, [], "user1", new Date());
}

function buildStrategy(currentPublishedVersionId: string | null): Strategy {
  return new Strategy("strat1", "org1", "Test", "desc", "CUSTOM", [], "ACTIVE", currentPublishedVersionId, "user1", new Date());
}

function buildHandler() {
  const versionRepository = { findById: jest.fn(), save: jest.fn() } as unknown as StrategyVersionRepository;
  const strategyRepository = { findById: jest.fn(), save: jest.fn() } as unknown as StrategyRepository;
  const publicationRepository = { save: jest.fn() } as unknown as StrategyPublicationRepository;
  const historyRecorder = { record: jest.fn() } as unknown as HistoryRecorderService;
  const eventPublisher: EventPublisher = { publish: jest.fn() };
  return { handler: new PublishVersionHandler(strategyRepository, versionRepository, publicationRepository, historyRecorder, eventPublisher), versionRepository, strategyRepository, publicationRepository, historyRecorder, eventPublisher };
}

describe("PublishVersionHandler — real coordination across version, strategy, and publication", () => {
  it("publishes a genuinely APPROVED version with no prior publication — version transitions to PUBLISHED, strategy's own pointer updates, a real publication record is created", async () => {
    const { handler, versionRepository, strategyRepository, publicationRepository } = buildHandler();
    const version = buildVersion("ver1", "APPROVED");
    (versionRepository.findById as jest.Mock).mockResolvedValue(version);
    (strategyRepository.findById as jest.Mock).mockResolvedValue(buildStrategy(null));

    const publication = await handler.execute(new PublishVersionCommand("org1", "ver1", "user1"));

    expect(version.status).toBe("PUBLISHED");
    expect(publication.supersedesVersionId).toBeNull();
    expect(strategyRepository.save).toHaveBeenCalledWith(expect.objectContaining({ currentPublishedVersionId: "ver1" }));
    expect(publicationRepository.save).toHaveBeenCalledWith(publication);
  });

  it("publishes BOTH a real StrategyPublishedEvent AND a real StrategyVersionPublishedEvent from the same call — 'support multiple events within a transaction' (this milestone's own rule)", async () => {
    const { handler, versionRepository, strategyRepository, eventPublisher } = buildHandler();
    const version = buildVersion("ver1", "APPROVED");
    (versionRepository.findById as jest.Mock).mockResolvedValue(version);
    (strategyRepository.findById as jest.Mock).mockResolvedValue(buildStrategy(null));

    await handler.execute(new PublishVersionCommand("org1", "ver1", "user1"));

    expect(eventPublisher.publish).toHaveBeenCalledWith([expect.objectContaining({ kind: "StrategyPublished" }), expect.objectContaining({ kind: "StrategyVersionPublished" })], expect.any(String), expect.any(String));
  });

  it("supersedes the PREVIOUSLY published version — the old version transitions PUBLISHED -> SUPERSEDED, and the new publication names it", async () => {
    const { handler, versionRepository, strategyRepository } = buildHandler();
    const newVersion = buildVersion("ver2", "APPROVED");
    const oldVersion = buildVersion("ver1", "PUBLISHED");
    (versionRepository.findById as jest.Mock).mockImplementation((id: string) => Promise.resolve(id === "ver2" ? newVersion : oldVersion));
    (strategyRepository.findById as jest.Mock).mockResolvedValue(buildStrategy("ver1"));

    const publication = await handler.execute(new PublishVersionCommand("org1", "ver2", "user1"));

    expect(newVersion.status).toBe("PUBLISHED");
    expect(oldVersion.status).toBe("SUPERSEDED");
    expect(publication.supersedesVersionId).toBe("ver1");
  });

  it("throws VersionNotApprovedException, WITHOUT any mutation, when the version isn't APPROVED", async () => {
    const { handler, versionRepository, versionRepository: vr } = buildHandler();
    const draftVersion = buildVersion("ver1", "DRAFT");
    (versionRepository.findById as jest.Mock).mockResolvedValue(draftVersion);

    await expect(handler.execute(new PublishVersionCommand("org1", "ver1", "user1"))).rejects.toThrow(VersionNotApprovedException);
    expect(vr.save).not.toHaveBeenCalled();
    expect(draftVersion.status).toBe("DRAFT");
  });

  it("throws StrategyVersionNotFoundException for a nonexistent version", async () => {
    const { handler, versionRepository } = buildHandler();
    (versionRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(handler.execute(new PublishVersionCommand("org1", "missing", "user1"))).rejects.toThrow(StrategyVersionNotFoundException);
  });

  it("throws StrategyNotFoundException when the version's own parent strategy is missing — a real data-integrity check, not assumed", async () => {
    const { handler, versionRepository, strategyRepository } = buildHandler();
    (versionRepository.findById as jest.Mock).mockResolvedValue(buildVersion("ver1", "APPROVED"));
    (strategyRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(handler.execute(new PublishVersionCommand("org1", "ver1", "user1"))).rejects.toThrow(StrategyNotFoundException);
  });
});
