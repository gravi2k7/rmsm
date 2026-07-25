export interface ModerationResult {
  readonly flagged: boolean;
  readonly categories: readonly string[];
  readonly confidence: number;
}
