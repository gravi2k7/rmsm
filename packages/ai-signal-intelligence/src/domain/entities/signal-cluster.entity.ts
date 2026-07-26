export interface SignalCluster {
  readonly key: string;
  readonly symbolCode: string;
  readonly direction: string;
  readonly opportunityIds: readonly string[];
}
