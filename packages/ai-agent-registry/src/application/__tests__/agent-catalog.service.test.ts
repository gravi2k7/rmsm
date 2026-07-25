import { describe, expect, it } from "vitest";
import { AgentCatalogService } from "../services/agent-catalog.service";
import { InMemoryAgentCatalogRepository } from "../../infrastructure/in-memory-agent-catalog.repository";
import { InMemoryAgentVersionRepository } from "../../infrastructure/in-memory-agent-version.repository";
import { AgentLifecycleStatus } from "../../domain/enums/agent-lifecycle.enum";
import {
  AgentAlreadyRegisteredError,
  AgentNotFoundError,
  DuplicateVersionError,
  NoActiveVersionError,
} from "../../domain/errors/agent-registry-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher, buildAgentConfig } from "./fakes";

function buildService(events?: RecordingEventPublisher) {
  const catalogRepository = new InMemoryAgentCatalogRepository();
  const versionRepository = new InMemoryAgentVersionRepository();
  const service = new AgentCatalogService(catalogRepository, versionRepository, new FixedClock(), new SequentialIdGenerator(), events);
  return { service, catalogRepository, versionRepository };
}

describe("AgentCatalogService", () => {
  it("registers a new agent in the catalog", async () => {
    const { service } = buildService();
    const entry = await service.registerAgent("agent-1", "Research Agent", "gathers research");
    expect(entry.activeVersion).toBeNull();
  });

  it("rejects registering the same agent id twice", async () => {
    const { service } = buildService();
    await service.registerAgent("agent-1", "Research Agent", "gathers research");
    await expect(service.registerAgent("agent-1", "x", "y")).rejects.toThrow(AgentAlreadyRegisteredError);
  });

  it("publishes a version as DRAFT, and rejects a duplicate version", async () => {
    const { service } = buildService();
    await service.registerAgent("agent-1", "Research Agent", "gathers research");
    const version = await service.publishVersion("agent-1", "1.0.0", buildAgentConfig({ id: "agent-1" }), ["research"]);
    expect(version.lifecycleStatus).toBe(AgentLifecycleStatus.DRAFT);

    await expect(service.publishVersion("agent-1", "1.0.0", buildAgentConfig({ id: "agent-1" }))).rejects.toThrow(DuplicateVersionError);
  });

  it("throws AgentNotFoundError when publishing a version for an unregistered agent", async () => {
    const { service } = buildService();
    await expect(service.publishVersion("missing", "1.0.0", buildAgentConfig())).rejects.toThrow(AgentNotFoundError);
  });

  it("activateVersion sets the active version and demotes the previously-active one to DEPRECATED", async () => {
    const events = new RecordingEventPublisher();
    const { service } = buildService(events);
    await service.registerAgent("agent-1", "Research Agent", "gathers research");
    await service.publishVersion("agent-1", "1.0.0", buildAgentConfig({ id: "agent-1" }), ["research"]);
    await service.publishVersion("agent-1", "2.0.0", buildAgentConfig({ id: "agent-1" }), ["research", "writing"]);

    await service.activateVersion("agent-1", "1.0.0");
    const entryAfterFirst = await service.activateVersion("agent-1", "2.0.0");

    expect(entryAfterFirst.activeVersion).toBe("2.0.0");
    const v1 = await service.getVersion("agent-1", "1.0.0");
    expect(v1.lifecycleStatus).toBe(AgentLifecycleStatus.DEPRECATED);
    const v2 = await service.getVersion("agent-1", "2.0.0");
    expect(v2.lifecycleStatus).toBe(AgentLifecycleStatus.ACTIVE);

    expect(events.published.filter((e) => e.kind === "AgentVersionDeprecated")).toHaveLength(1);
    expect(events.published.filter((e) => e.kind === "AgentVersionActivated")).toHaveLength(2);
  });

  it("getActiveConfig returns the AgentConfig of the active version, reusing AI-401's own type", async () => {
    const { service } = buildService();
    await service.registerAgent("agent-1", "Research Agent", "gathers research");
    await service.publishVersion("agent-1", "1.0.0", buildAgentConfig({ id: "agent-1", maxSteps: 9 }), ["research"]);
    await service.activateVersion("agent-1", "1.0.0");

    const config = await service.getActiveConfig("agent-1");
    expect(config.maxSteps).toBe(9);
  });

  it("throws NoActiveVersionError when no version has been activated yet", async () => {
    const { service } = buildService();
    await service.registerAgent("agent-1", "Research Agent", "gathers research");
    await service.publishVersion("agent-1", "1.0.0", buildAgentConfig({ id: "agent-1" }));

    await expect(service.getActiveConfig("agent-1")).rejects.toThrow(NoActiveVersionError);
  });

  it("retireVersion clears activeVersion when the active version is retired", async () => {
    const { service } = buildService();
    await service.registerAgent("agent-1", "Research Agent", "gathers research");
    await service.publishVersion("agent-1", "1.0.0", buildAgentConfig({ id: "agent-1" }));
    await service.activateVersion("agent-1", "1.0.0");

    await service.retireVersion("agent-1", "1.0.0");

    const entry = await service.getEntry("agent-1");
    expect(entry.activeVersion).toBeNull();
    const version = await service.getVersion("agent-1", "1.0.0");
    expect(version.lifecycleStatus).toBe(AgentLifecycleStatus.RETIRED);
  });

  it("lists every version published for an agent", async () => {
    const { service } = buildService();
    await service.registerAgent("agent-1", "Research Agent", "gathers research");
    await service.publishVersion("agent-1", "1.0.0", buildAgentConfig({ id: "agent-1" }));
    await service.publishVersion("agent-1", "2.0.0", buildAgentConfig({ id: "agent-1" }));

    expect(await service.listVersions("agent-1")).toHaveLength(2);
  });
});
