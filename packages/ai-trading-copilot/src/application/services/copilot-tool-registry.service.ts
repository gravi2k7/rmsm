import type { ToolRegistry, ToolHandler } from "@rmsm/ai-chat";
import { DefaultToolRegistry } from "@rmsm/ai-chat";
import type { ToolDefinition } from "@rmsm/ai-chat";

export interface CopilotToolSpec {
  readonly definition: ToolDefinition;
  readonly handler: ToolHandler;
}

/**
 * Builds a REAL, unmodified `@rmsm/ai-chat` (AI-301) `DefaultToolRegistry`
 * and registers copilot tools onto it — the actual AI-601..605 service
 * calls live in each `CopilotToolSpec`'s own `handler`, supplied by the
 * caller (typically composed at the application's wiring root); this
 * service never re-implements tool dispatch itself, only registration.
 */
export class CopilotToolRegistryService {
  build(specs: readonly CopilotToolSpec[]): ToolRegistry {
    const registry = new DefaultToolRegistry();
    for (const spec of specs) {
      registry.register(spec.definition, spec.handler);
    }
    return registry;
  }
}
