import type { ToolRegistry } from "../../repositories/tool-registry.interface";
import type { ToolDefinition } from "../../domain/entities/tool-definition.entity";

/** The "Tool discovery" capability made explicit as its own service —
 * thin today (delegates to `ToolRegistry`), but the seam an agent's
 * planner (AI-404) queries to find tools relevant to a goal without
 * needing to know `ToolRegistry`'s internals. */
export class ToolDiscoveryService {
  constructor(private readonly toolRegistry: ToolRegistry) {}

  listAll(): readonly ToolDefinition[] {
    return this.toolRegistry.list();
  }

  findByTag(tag: string): readonly ToolDefinition[] {
    return this.toolRegistry.findByTag(tag);
  }

  search(query: string): readonly ToolDefinition[] {
    const needle = query.toLowerCase();
    return this.toolRegistry.list().filter(
      (definition) =>
        definition.metadata.name.toLowerCase().includes(needle) || definition.metadata.description.toLowerCase().includes(needle),
    );
  }
}
