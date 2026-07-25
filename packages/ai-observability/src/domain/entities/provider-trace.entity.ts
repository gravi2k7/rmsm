export interface ProviderTrace {
  readonly requestId: string;
  readonly providerName: string;
  readonly model: string;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly succeeded: boolean | null;
}
