import type { BrokerHealthSnapshot } from "./broker-models";

/** BR-001's Health Provider section: Connected, Session Valid, Ping, Broker Reachable, Terminal Available — all reflected on `BrokerHealthSnapshot`. Never throws — a failed probe is reported AS a snapshot, matching every `HealthProvider` in the Market Data domain's own convention (independently reimplemented here, not imported, per this domain's strict-separation rule). */
export interface BrokerHealthProvider {
  checkHealth(): Promise<BrokerHealthSnapshot>;
}
