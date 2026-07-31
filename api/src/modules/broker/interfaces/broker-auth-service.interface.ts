import type { BrokerCredentials, BrokerSession } from "./broker-models";

/** BR-001's Authentication section: Login, Password, Server, Terminal Path, Connection Status. Connection Status itself lives on `BrokerConnectionManager`, not here — authenticating and being connected are related but distinct concerns (a broker can be connected but not yet logged in). */
export interface BrokerAuthService {
  login(credentials: BrokerCredentials): Promise<BrokerSession>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getSession(): BrokerSession | undefined;
}
