import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ToolExecutionService } from "../services/tool-execution.service";
import { DefaultToolRegistry } from "../../infrastructure/default-tool.registry";
import { StaticPermissionChecker } from "../../infrastructure/static-permission.checker";
import { ToolResultStatus } from "../../domain/enums/tool.enum";
import { ToolNotFoundError } from "../../domain/errors/tool-domain.errors";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";
import type { ToolDefinition } from "../../domain/entities/tool-definition.entity";
import type { ToolInvocation } from "../../domain/entities/tool-invocation.entity";

function setup() {
  const registry = new DefaultToolRegistry();
  const events = new RecordingEventPublisher();
  const service = new ToolExecutionService(registry, new StaticPermissionChecker(), new SystemLikeClock(), new SequentialIdGenerator(), events);
  return { registry, events, service };
}

describe("ToolExecutionService", () => {
  it("executes a registered tool and normalizes a SUCCEEDED result", async () => {
    const { registry, events, service } = setup();
    const definition: ToolDefinition = {
      metadata: { name: "search", description: "d", version: "1.0.0", tags: [] },
      parametersSchema: z.object({ query: z.string() }),
      requiredPermissions: [],
    };
    registry.register(definition, async (args) => `results for ${(args as { query: string }).query}`);

    const invocation: ToolInvocation = { id: "inv-1", toolName: "search", arguments: { query: "cats" }, grantedPermissions: [] };
    const result = await service.execute(invocation);

    expect(result.status).toBe(ToolResultStatus.SUCCEEDED);
    expect(result.output).toBe("results for cats");
    expect(events.published.map((e) => e.kind)).toEqual(["ToolInvoked", "ToolSucceeded"]);
  });

  it("returns INVALID_PARAMETERS without invoking the handler when arguments fail schema validation", async () => {
    const { registry, service } = setup();
    let handlerCalled = false;
    registry.register(
      { metadata: { name: "search", description: "d", version: "1.0.0", tags: [] }, parametersSchema: z.object({ query: z.string() }), requiredPermissions: [] },
      async () => {
        handlerCalled = true;
        return "x";
      },
    );

    const result = await service.execute({ id: "inv-1", toolName: "search", arguments: { query: 123 }, grantedPermissions: [] });

    expect(result.status).toBe(ToolResultStatus.INVALID_PARAMETERS);
    expect(handlerCalled).toBe(false);
  });

  it("returns PERMISSION_DENIED without invoking the handler when a required permission is missing", async () => {
    const { registry, events, service } = setup();
    let handlerCalled = false;
    registry.register(
      { metadata: { name: "admin-tool", description: "d", version: "1.0.0", tags: [] }, parametersSchema: z.object({}), requiredPermissions: ["admin"] },
      async () => {
        handlerCalled = true;
        return "x";
      },
    );

    const result = await service.execute({ id: "inv-1", toolName: "admin-tool", arguments: {}, grantedPermissions: [] });

    expect(result.status).toBe(ToolResultStatus.PERMISSION_DENIED);
    expect(handlerCalled).toBe(false);
    expect(events.published.map((e) => e.kind)).toEqual(["ToolInvoked", "ToolPermissionDenied"]);
  });

  it("retries a failing handler up to maxAttempts and succeeds on the last try", async () => {
    const { registry, service } = setup();
    let attempts = 0;
    registry.register({ metadata: { name: "flaky", description: "d", version: "1.0.0", tags: [] }, parametersSchema: z.object({}), requiredPermissions: [] }, async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("not yet");
      return "ok";
    });

    const result = await service.execute({ id: "inv-1", toolName: "flaky", arguments: {}, grantedPermissions: [] }, { retry: { maxAttempts: 3 } });

    expect(result.status).toBe(ToolResultStatus.SUCCEEDED);
    expect(result.attempts).toBe(3);
  });

  it("returns FAILED after exhausting retries", async () => {
    const { registry, service } = setup();
    registry.register({ metadata: { name: "always-fails", description: "d", version: "1.0.0", tags: [] }, parametersSchema: z.object({}), requiredPermissions: [] }, async () => {
      throw new Error("boom");
    });

    const result = await service.execute({ id: "inv-1", toolName: "always-fails", arguments: {}, grantedPermissions: [] }, { retry: { maxAttempts: 2 } });

    expect(result.status).toBe(ToolResultStatus.FAILED);
    expect(result.error).toBe("boom");
  });

  it("returns TIMED_OUT for a handler that exceeds timeoutMs", async () => {
    const { registry, service } = setup();
    registry.register({ metadata: { name: "hangs", description: "d", version: "1.0.0", tags: [] }, parametersSchema: z.object({}), requiredPermissions: [] }, () => new Promise(() => {}));

    const result = await service.execute({ id: "inv-1", toolName: "hangs", arguments: {}, grantedPermissions: [] }, { timeoutMs: 20 });

    expect(result.status).toBe(ToolResultStatus.TIMED_OUT);
  });

  it("throws ToolNotFoundError for an unregistered tool", async () => {
    const { service } = setup();
    await expect(service.execute({ id: "inv-1", toolName: "missing", arguments: {}, grantedPermissions: [] })).rejects.toThrow(ToolNotFoundError);
  });
});
