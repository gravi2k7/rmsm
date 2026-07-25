import type { ToolResultStatus } from "../enums/tool.enum";

/** The "Result normalization" capability's one output shape — every
 * tool invocation, regardless of how it succeeded or failed, resolves
 * to this same structure. */
export interface ToolResult {
  readonly invocationId: string;
  readonly toolName: string;
  readonly status: ToolResultStatus;
  readonly output?: unknown;
  readonly error?: string;
  readonly attempts: number;
  readonly durationMs: number;
}
