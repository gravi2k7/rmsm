import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { DefaultToolRegistry } from "../default-tool.registry";
import { ToolAlreadyRegisteredError } from "../../domain/errors/tool-domain.errors";
import type { ToolDefinition } from "../../domain/entities/tool-definition.entity";

function makeDefinition(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    metadata: { name: "search", description: "search the web", version: "1.0.0", tags: ["search"] },
    parametersSchema: z.object({ query: z.string() }),
    requiredPermissions: [],
    ...overrides,
  };
}

describe("DefaultToolRegistry", () => {
  let registry: DefaultToolRegistry;

  beforeEach(() => {
    registry = new DefaultToolRegistry();
  });

  it("registers and retrieves a tool by name", () => {
    const definition = makeDefinition();
    const handler = async () => "result";
    registry.register(definition, handler);

    const entry = registry.get("search");
    expect(entry?.definition).toEqual(definition);
    expect(entry?.handler).toBe(handler);
  });

  it("throws ToolAlreadyRegisteredError for a duplicate name", () => {
    registry.register(makeDefinition(), async () => "x");
    expect(() => registry.register(makeDefinition(), async () => "y")).toThrow(ToolAlreadyRegisteredError);
  });

  it("lists all registered tools", () => {
    registry.register(makeDefinition(), async () => "x");
    expect(registry.list()).toHaveLength(1);
  });

  it("findByTag filters by metadata.tags", () => {
    registry.register(makeDefinition({ metadata: { name: "search", description: "d", version: "1.0.0", tags: ["web"] } }), async () => "x");
    registry.register(makeDefinition({ metadata: { name: "calc", description: "d", version: "1.0.0", tags: ["math"] } }), async () => "y");

    expect(registry.findByTag("web").map((d) => d.metadata.name)).toEqual(["search"]);
  });
});
