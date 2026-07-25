import type { ToolDefinition } from "../domain/entities/tool-definition.entity";
import type { ToolHandler } from "./tool-handler.interface";

/**
 * The "Future MCP compatibility" capability — an abstraction only,
 * zero implementations ship in this package (the same
 * abstraction-only discipline `@rmsm/ai-memory`'s `VectorStoreProvider`
 * and `@rmsm/ai-rag`'s `VectorStore` follow). A future MCP client
 * adapter implements this to expose an MCP server's tools as
 * `ToolDefinition`s this package's `ToolRegistry` can register — server
 * discovery, transport, and protocol framing are all out of scope here.
 */
export interface McpToolSource {
  discoverTools(): Promise<ReadonlyArray<{ definition: ToolDefinition; handler: ToolHandler }>>;
}
