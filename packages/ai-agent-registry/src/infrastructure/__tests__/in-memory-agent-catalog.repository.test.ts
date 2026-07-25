import { describe, expect, it } from "vitest";
import { InMemoryAgentCatalogRepository } from "../in-memory-agent-catalog.repository";

describe("InMemoryAgentCatalogRepository", () => {
  it("saves, retrieves, and lists catalog entries", async () => {
    const repo = new InMemoryAgentCatalogRepository();
    const entry = { agentId: "a1", name: "Agent One", description: "d", activeVersion: null, createdAt: new Date(), updatedAt: new Date() };
    await repo.save(entry);

    expect((await repo.findById("a1"))?.name).toBe("Agent One");
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.findById("missing")).toBeNull();
  });
});
