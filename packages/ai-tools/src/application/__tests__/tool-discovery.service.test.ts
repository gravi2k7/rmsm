import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ToolDiscoveryService } from "../services/tool-discovery.service";
import { DefaultToolRegistry } from "../../infrastructure/default-tool.registry";

describe("ToolDiscoveryService", () => {
  it("searches tools by name/description substring", () => {
    const registry = new DefaultToolRegistry();
    registry.register(
      { metadata: { name: "web-search", description: "search the public web", version: "1.0.0", tags: [] }, parametersSchema: z.object({}), requiredPermissions: [] },
      async () => "x",
    );
    registry.register(
      { metadata: { name: "calculator", description: "does math", version: "1.0.0", tags: [] }, parametersSchema: z.object({}), requiredPermissions: [] },
      async () => "y",
    );

    const discovery = new ToolDiscoveryService(registry);
    expect(discovery.search("web").map((d) => d.metadata.name)).toEqual(["web-search"]);
    expect(discovery.search("math").map((d) => d.metadata.name)).toEqual(["calculator"]);
  });
});
