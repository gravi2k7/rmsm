import type { ToolDefinition } from "../domain/entities/tool-definition.entity";
import type { ToolHandler } from "./tool-handler.interface";

/** The "Tool registry" + "Tool discovery" capability's port —
 * `list()`/`findByTag()` are the discovery surface; `get()` is what
 * `ToolExecutionService` resolves an invocation against. */
export interface ToolRegistry {
  register(definition: ToolDefinition, handler: ToolHandler): void;
  get(name: string): { definition: ToolDefinition; handler: ToolHandler } | undefined;
  list(): readonly ToolDefinition[];
  findByTag(tag: string): readonly ToolDefinition[];
}
