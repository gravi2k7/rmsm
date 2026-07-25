export interface ExtractionResult<T> {
  readonly data: T | null;
  readonly raw: unknown;
  readonly valid: boolean;
  readonly errors: readonly string[];
}
