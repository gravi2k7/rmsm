/** The "Tool metadata" capability — descriptive, non-behavioral
 * information about a tool, used for discovery (search by `tags`) and
 * display, never consulted by `ToolExecutionService` itself. */
export interface ToolMetadata {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly tags: readonly string[];
}
