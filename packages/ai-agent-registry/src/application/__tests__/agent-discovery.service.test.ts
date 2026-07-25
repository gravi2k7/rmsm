import { describe, expect, it } from "vitest";
import { AgentCatalogService } from "../services/agent-catalog.service";
import { AgentDiscoveryService } from "../services/agent-discovery.service";
import { InMemoryAgentCatalogRepository } from "../../infrastructure/in-memory-agent-catalog.repository";
import { InMemoryAgentVersionRepository } from "../../infrastructure/in-memory-agent-version.repository";
import { FixedClock, SequentialIdGenerator, buildAgentConfig } from "./fakes";

async function seedCatalog() {
  const catalogRepository = new InMemoryAgentCatalogRepository();
  const versionRepository = new InMemoryAgentVersionRepository();
  const catalog = new AgentCatalogService(catalogRepository, versionRepository, new FixedClock(), new SequentialIdGenerator());
  const discovery = new AgentDiscoveryService(catalogRepository, versionRepository);

  await catalog.registerAgent("agent-research", "Research Agent", "gathers market research");
  await catalog.publishVersion("agent-research", "1.0.0", buildAgentConfig({ id: "agent-research" }), ["research", "web-search"]);
  await catalog.activateVersion("agent-research", "1.0.0");

  await catalog.registerAgent("agent-writer", "Writing Agent", "drafts reports");
  await catalog.publishVersion("agent-writer", "1.0.0", buildAgentConfig({ id: "agent-writer" }), ["writing"]);
  // Deliberately left un-activated (still DRAFT) to prove discovery excludes it.

  return { discovery };
}

describe("AgentDiscoveryService", () => {
  it("finds catalog entries by a capability on their active version", async () => {
    const { discovery } = await seedCatalog();
    const results = await discovery.findByCapability("research");
    expect(results.map((e) => e.agentId)).toEqual(["agent-research"]);
  });

  it("excludes agents whose matching version isn't active yet", async () => {
    const { discovery } = await seedCatalog();
    const results = await discovery.findByCapability("writing");
    expect(results).toEqual([]);
  });

  it("searches by case-insensitive name/description match", async () => {
    const { discovery } = await seedCatalog();
    const results = await discovery.search("MARKET");
    expect(results.map((e) => e.agentId)).toEqual(["agent-research"]);
  });

  it("returns an empty list for a blank query", async () => {
    const { discovery } = await seedCatalog();
    expect(await discovery.search("   ")).toEqual([]);
  });
});
