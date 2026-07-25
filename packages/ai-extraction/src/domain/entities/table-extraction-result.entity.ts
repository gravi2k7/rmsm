export interface TableExtractionResult {
  readonly headers: readonly string[];
  readonly rows: readonly Readonly<Record<string, string>>[];
}
