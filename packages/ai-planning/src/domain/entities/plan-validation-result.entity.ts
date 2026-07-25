export interface PlanValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
