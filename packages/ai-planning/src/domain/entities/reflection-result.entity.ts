export interface ReflectionResult {
  readonly planId: string;
  readonly shouldReplan: boolean;
  readonly reason: string;
  readonly failedTaskIds: readonly string[];
}
