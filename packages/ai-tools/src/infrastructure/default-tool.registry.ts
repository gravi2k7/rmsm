import type { ToolRegistry } from "../repositories/tool-registry.interface";
import type { ToolHandler } from "../repositories/tool-handler.interface";
import type { ToolDefinition } from "../domain/entities/tool-definition.entity";
import { ToolAlreadyRegisteredError } from "../domain/errors/tool-domain.errors";

export class DefaultToolRegistry implements ToolRegistry {
  private readonly entries = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();

  register(definition: ToolDefinition, handler: ToolHandler): void {
    if (this.entries.has(definition.metadata.name)) {
      throw new ToolAlreadyRegisteredError(definition.metadata.name);
    }
    this.entries.set(definition.metadata.name, { definition, handler });
  }

  get(name: string): { definition: ToolDefinition; handler: ToolHandler } | undefined {
    return this.entries.get(name);
  }

  list(): readonly ToolDefinition[] {
    return [...this.entries.values()].map((entry) => entry.definition);
  }

  findByTag(tag: string): readonly ToolDefinition[] {
    return this.list().filter((definition) => definition.metadata.tags.includes(tag));
  }
}
