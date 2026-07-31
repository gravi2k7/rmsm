import { Injectable, Logger } from "@nestjs/common";
import type { BrokerSessionManager } from "../../interfaces/broker-session-manager.interface";
import type { BrokerCredentials, BrokerSession } from "../../interfaces/broker-models";
import { MetaTrader5Client } from "./metatrader5.client";

/**
 * BR-001's Session Manager section: Login, Logout, Refresh Session,
 * Session Validation, Session Expiration. See
 * `BrokerConnectionManager`'s own doc comment (implemented by
 * `MetaTrader5ConnectionManager`) for why this is a separate concern
 * from connection management, even though both ultimately delegate to
 * `MetaTrader5Client`.
 */
@Injectable()
export class MetaTrader5SessionManager implements BrokerSessionManager {
  private readonly logger = new Logger(MetaTrader5SessionManager.name);
  private session: BrokerSession | undefined;
  private lastCredentials: BrokerCredentials | undefined;

  constructor(private readonly client: MetaTrader5Client) {}

  async login(credentials: BrokerCredentials): Promise<BrokerSession> {
    const raw = await this.client.login(credentials);
    this.lastCredentials = credentials;
    this.session = {
      sessionId: raw.sessionId,
      accountNumber: raw.accountNumber,
      server: raw.server,
      connectedAt: new Date(raw.connectedAt),
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : undefined,
    };
    return this.session;
  }

  async logout(): Promise<void> {
    await this.client.logout();
    this.session = undefined;
    this.lastCredentials = undefined;
  }

  async refreshSession(): Promise<BrokerSession> {
    if (!this.lastCredentials) {
      const err: { isSessionExpired: true; message: string } = { isSessionExpired: true, message: "No prior MT5 session to refresh — call login() first." };
      throw err;
    }
    this.logger.log({ msg: "mt5.session.refresh" });
    return this.login(this.lastCredentials);
  }

  isSessionValid(): boolean {
    if (!this.session) return false;
    if (this.session.expiresAt && this.session.expiresAt.getTime() <= Date.now()) return false;
    return true;
  }

  getSession(): BrokerSession | undefined {
    return this.session;
  }
}
