import { describe, expect, it } from "vitest";
import { InMemoryAgentVersionRepository } from "../in-memory-agent-version.repository";
import { AgentLifecycleStatus } from "../../domain/enums/agent-lifecycle.enum";
import { buildAgentConfig } from "../../application/__tests__/fakes";

describe("InMemoryAgentVersionRepository", () => {
  it("saves and finds a version by agent id and version, and lists all versions for an agent", async () => {
    const repo = new InMemoryAgentVersionRepository();
    const v1 = { agentId: "a1", version: "1.0.0", config: buildAgentConfig(), capabilities: [], configurationMetadata: {}, lifecycleStatus: AgentLifecycleStatus.DRAFT, createdAt: new Date() };
    const v2 = { ...v1, version: "2.0.0" };
    await repo.save(v1);
    await repo.save(v2);

    expect((await repo.findByAgentAndVersion("a1", "1.0.0"))?.version).toBe("1.0.0");
    expect(await repo.listByAgent("a1")).toHaveLength(2);
    expect(await repo.findByAgentAndVersion("a1", "missing")).toBeNull();
  });
});
