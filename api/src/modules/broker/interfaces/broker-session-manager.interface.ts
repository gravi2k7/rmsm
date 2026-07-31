import type { BrokerCredentials, BrokerSession } from "./broker-models";

/** BR-001's Session Manager section: Login, Logout, Refresh Session, Session Validation, Session Expiration. See `BrokerConnectionManager`'s own doc comment for how this differs from connection management. */
export interface BrokerSessionManager {
  login(credentials: BrokerCredentials): Promise<BrokerSession>;
  logout(): Promise<void>;
  refreshSession(): Promise<BrokerSession>;
  isSessionValid(): boolean;
  getSession(): BrokerSession | undefined;
}
