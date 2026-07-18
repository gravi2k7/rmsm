/** Generic sort direction — used by any module's own paginated/sorted
 * query, not tied to a specific field or domain. */
export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

/** Generic severity level — the same shape AI-103's own
 * `ValidationFinding.severity` already uses (`"ERROR" | "WARNING"`),
 * extracted here as the reusable enum other modules' own validation/
 * diagnostics results can share instead of each redeclaring the same two
 * (or three) string literals. */
export enum Severity {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}
