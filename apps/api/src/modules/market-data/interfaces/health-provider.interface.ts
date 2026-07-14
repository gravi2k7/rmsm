import type { ProviderOutageClassification } from "../contracts/workflow.contracts";

export interface ProviderHealthSnapshot {
  status: ProviderOutageClassification;
  latencyMs?: number;
  lastCheckedAt: Date;
  message?: string;
}

/** Reuses ProviderOutageClassification (contracts/workflow.contracts.ts, Phase 1) rather than declaring a second, parallel health-status type — one vocabulary for "how healthy is this provider," not two that could drift apart. */
export interface HealthProvider {
  checkHealth(): Promise<ProviderHealthSnapshot>;
}
