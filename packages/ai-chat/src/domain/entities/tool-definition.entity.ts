/** Describes one invocable tool a `ChatProvider` may call mid-completion
 * — the abstraction the spec's "tool invocation hooks" capability is
 * built on. `parametersSchema` is a JSON-Schema-shaped plain object
 * (not a zod schema) so it can be handed directly to any provider's
 * function-calling API without a translation layer. */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parametersSchema: Readonly<Record<string, unknown>>;
}

export interface ToolCall {
  readonly id: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface ToolResult {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly content: string;
  readonly isError: boolean;
}
