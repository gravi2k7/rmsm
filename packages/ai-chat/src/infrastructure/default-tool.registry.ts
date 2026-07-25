import type { ToolRegistry, ToolHandler } from "../repositories/tool-registry.interface";
import type { ToolDefinition, ToolCall, ToolResult } from "../domain/entities/tool-definition.entity";
import { ToolNotRegisteredError } from "../domain/errors/chat-domain.errors";

export class DefaultToolRegistry implements ToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>();
  private readonly handlers = new Map<string, ToolHandler>();

  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.definitions.set(definition.name, definition);
    this.handlers.set(definition.name, handler);
  }

  get(toolName: string): ToolHandler | undefined {
    return this.handlers.get(toolName);
  }

  list(): readonly ToolDefinition[] {
    return [...this.definitions.values()];
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    const handler = this.handlers.get(call.toolName);
    if (!handler) {
      throw new ToolNotRegisteredError(call.toolName);
    }
    return handler(call);
  }
}
