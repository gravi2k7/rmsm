import type { BrokerConnectionHealth } from "./broker-models";

/** BR-001's Connection Manager section: Connect, Disconnect, Auto Reconnect, Retry Strategy, Connection Health, Session Timeout. Deliberately separate from `BrokerSessionManager` — a connection is transport-level (is there a live socket/HTTP channel to the broker at all); a session is application-level (are we logged in on that channel). A broker can be connected but not logged in, or can lose its session while the connection itself stays up. */
export interface BrokerConnectionManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionHealth(): BrokerConnectionHealth;
}
