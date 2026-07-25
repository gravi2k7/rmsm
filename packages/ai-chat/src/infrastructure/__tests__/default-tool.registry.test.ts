import { describe, it, expect, beforeEach } from "vitest";
import { DefaultToolRegistry } from "../default-tool.registry";
import { ToolNotRegisteredError } from "../../domain/errors/chat-domain.errors";

describe("DefaultToolRegistry", () => {
  let registry: DefaultToolRegistry;

  beforeEach(() => {
    registry = new DefaultToolRegistry();
  });

  it("registers and lists tool definitions", () => {
    registry.register({ name: "search", description: "search the web", parametersSchema: {} }, async (call) => ({
      toolCallId: call.id,
      toolName: call.toolName,
      content: "result",
      isError: false,
    }));

    expect(registry.list().map((d) => d.name)).toEqual(["search"]);
  });

  it("invokes a registered tool's handler", async () => {
    registry.register({ name: "search", description: "d", parametersSchema: {} }, async (call) => ({
      toolCallId: call.id,
      toolName: call.toolName,
      content: `handled ${call.arguments.query}`,
      isError: false,
    }));

    const result = await registry.invoke({ id: "c1", toolName: "search", arguments: { query: "cats" } });
    expect(result.content).toBe("handled cats");
  });

  it("throws ToolNotRegisteredError for an unknown tool", async () => {
    await expect(registry.invoke({ id: "c1", toolName: "missing", arguments: {} })).rejects.toThrow(ToolNotRegisteredError);
  });
});
