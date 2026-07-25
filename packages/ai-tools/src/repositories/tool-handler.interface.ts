export interface ToolHandler {
  (parsedArguments: unknown): Promise<unknown>;
}
