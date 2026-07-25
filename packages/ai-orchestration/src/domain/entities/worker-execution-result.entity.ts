export interface WorkerExecutionResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: string;
}
