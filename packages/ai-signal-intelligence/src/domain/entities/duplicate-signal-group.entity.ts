export interface DuplicateSignalGroup {
  readonly symbolCode: string;
  readonly direction: string;
  readonly opportunityIds: readonly string[];
  readonly windowMs: number;
}
