import type { ToolDefinition, ToolCall, ToolResult } from "../domain/entities/tool-definition.entity";

export interface ToolHandler {
  (call: ToolCall): Promise<ToolResult>;
}

export interface ToolRegistry {
  register(definition: ToolDefinition, handler: ToolHandler): void;
  get(toolName: string): ToolHandler | undefined;
  list(): readonly ToolDefinition[];
  invoke(call: ToolCall): Promise<ToolResult>;
}
