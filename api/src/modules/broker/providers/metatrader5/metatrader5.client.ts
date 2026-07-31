import { Injectable, Logger } from "@nestjs/common";
import type { BrokerConnectionStatus } from "../../contracts/broker.contracts";
import type { BrokerCredentials } from "../../interfaces/broker-models";
import type { Mt5BrokerError } from "./metatrader5.error-mapper";
import type { Mt5SessionResponse, Mt5PingResponse } from "./metatrader5.types";

export interface MetaTrader5ClientConfig {
  gatewayUrl: string;
  timeoutMs: number;
  maxRetry: number;
  heartbeatSeconds: number;
}

/**
 * MT5 has no native REST/Node-consumable API: MetaQuotes' own Python
 * package only works against a live terminal running on the same
 * Windows host (IPC, not network-callable), and the proprietary Manager
 * API is a binary broker-side protocol requiring broker-operator
 * credentials, not a regular trading account. The realistic, honest
 * architecture for a Node.js backend — and the one used here — is a
 * configurable **MT5 gateway/bridge**: a self-hosted companion service
 * (or a vendor gateway) that itself holds the terminal/Manager-API
 * connection and exposes a plain HTTP+WebSocket contract this client
 * targets. `MT5_GATEWAY_URL` (`@rmsm/config`) points at whichever
 * gateway a deployment runs; nothing here is hardcoded to a specific
 * vendor's proprietary request/response shape beyond the contract
 * documented in metatrader5.types.ts — directly satisfying BR-001's own
 * "Do NOT tightly couple RMSM to MetaTrader" rule at the transport
 * layer, not just at the `BrokerProvider` abstraction layer.
 *
 * Owns Connect/Disconnect/Login/Logout/Reconnect/Connection
 * Status/Ping/Heartbeat — BR-001's own Client responsibilities list,
 * verbatim. Structured logging never includes `password` or the
 * negotiated `sessionId` in full (see `maskSecret()`) — the same
 * discipline every credential-bearing client in this codebase has kept
 * since the API key handling in MD-001.
 */
@Injectable()
export class MetaTrader5Client {
  private readonly logger = new Logger(MetaTrader5Client.name);
  private status: BrokerConnectionStatus = "DISCONNECTED";
  private sessionId: string | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private lastCredentials: BrokerCredentials | undefined;

  constructor(private readonly config: MetaTrader5ClientConfig) {}

  async connect(): Promise<void> {
    this.status = "CONNECTING";
    this.logger.log({ msg: "mt5.connect", gatewayUrl: this.config.gatewayUrl });
    try {
      await this.ping();
      this.status = "CONNECTED";
      this.logger.log({ msg: "mt5.connected" });
    } catch (err) {
      this.status = "FAILED";
      this.logger.warn({ msg: "mt5.connect.failed" });
      throw this.toConnectionFailedError(err);
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.status = "DISCONNECTED";
    this.sessionId = undefined;
    this.logger.log({ msg: "mt5.disconnected" });
  }

  async login(credentials: BrokerCredentials): Promise<Mt5SessionResponse> {
    this.logger.log({ msg: "mt5.login", login: credentials.login, server: credentials.server });
    try {
      const session = await this.request<Mt5SessionResponse>("POST", "/login", {
        login: credentials.login,
        password: credentials.password,
        server: credentials.server,
        terminalPath: credentials.terminalPath,
      });
      this.sessionId = session.sessionId;
      this.lastCredentials = credentials;
      this.logger.log({ msg: "mt5.login.ok", accountNumber: session.accountNumber, sessionId: this.maskSecret(session.sessionId) });
      return session;
    } catch (err) {
      this.logger.warn({ msg: "mt5.login.failed", login: credentials.login });
      throw this.toLoginFailedError(err);
    }
  }

  async logout(): Promise<void> {
    if (!this.sessionId) return;
    try {
      await this.request("POST", "/logout", {});
    } finally {
      this.sessionId = undefined;
      this.lastCredentials = undefined;
      this.logger.log({ msg: "mt5.logout" });
    }
  }

  /** Disconnects, reconnects, and — if a session was previously established — logs back in with the last-used credentials. Used by `MetaTrader5ConnectionManager`'s auto-reconnect/retry strategy. */
  async reconnect(): Promise<void> {
    this.status = "RECONNECTING";
    this.logger.log({ msg: "mt5.reconnect" });
    await this.disconnect();
    await this.connect();
    if (this.lastCredentials) {
      await this.login(this.lastCredentials);
    }
  }

  getConnectionStatus(): BrokerConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === "CONNECTED";
  }

  hasSession(): boolean {
    return this.sessionId !== undefined;
  }

  async ping(): Promise<Mt5PingResponse> {
    return this.request<Mt5PingResponse>("GET", "/ping", undefined, { skipSession: true });
  }

  startHeartbeat(onFailure: (err: unknown) => void): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.ping().catch((err: unknown) => {
        this.logger.warn({ msg: "mt5.heartbeat.failed" });
        onFailure(err);
      });
    }, this.config.heartbeatSeconds * 1_000);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /** Used by every `MetaTrader5*Service` for authenticated gateway calls — attaches the session id header, retries with backoff on retryable failures, and never logs the session id or any request body field named `password`. */
  async request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown, options: { skipSession?: boolean } = {}): Promise<T> {
    const attempts = this.config.maxRetry + 1;
    let lastError: Mt5BrokerError = { isNetworkError: true, message: "MT5 gateway request never attempted" };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      this.logger.log({ msg: "mt5.request", method, path, attempt, of: attempts });
      try {
        return await this.fetchOnce<T>(method, path, body, options);
      } catch (err) {
        const classified = this.classifyThrown(err);
        lastError = classified;
        this.logger.warn({ msg: "mt5.request.failed", method, path, attempt, of: attempts, httpStatus: classified.httpStatus });

        const isFinalAttempt = attempt === attempts;
        const retryable = Boolean(classified.isTimeout) || Boolean(classified.isNetworkError) || Boolean(classified.isBrokerOffline) || this.isRetryableStatus(classified.httpStatus);
        if (isFinalAttempt || !retryable) throw classified;
        await this.backoff(attempt);
      }
    }
    throw lastError;
  }

  private async fetchOnce<T>(method: string, path: string, body: unknown, options: { skipSession?: boolean }): Promise<T> {
    const url = `${this.config.gatewayUrl}${path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (!options.skipSession && this.sessionId) headers["X-MT5-Session"] = this.sessionId;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: controller.signal });

      let parsed: unknown;
      try {
        parsed = res.status === 204 ? {} : await res.json();
      } catch {
        const err: Mt5BrokerError = { isNetworkError: true, message: "MT5 gateway response was not valid JSON" };
        throw err;
      }

      if (!res.ok) {
        const err: Mt5BrokerError = { httpStatus: res.status, message: this.extractMessage(parsed) };
        throw err;
      }
      return parsed as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutError: Mt5BrokerError = { isTimeout: true, message: `MT5 gateway request exceeded ${this.config.timeoutMs}ms` };
        throw timeoutError;
      }
      if (this.isMt5BrokerError(err)) throw err;
      const networkError: Mt5BrokerError = { isNetworkError: true, message: err instanceof Error ? err.message : "Unknown network failure" };
      throw networkError;
    } finally {
      clearTimeout(timer);
    }
  }

  private toConnectionFailedError(err: unknown): Mt5BrokerError {
    const classified = this.classifyThrown(err);
    return { ...classified, isConnectionFailed: true };
  }

  private toLoginFailedError(err: unknown): Mt5BrokerError {
    const classified = this.classifyThrown(err);
    if (classified.httpStatus === 401 || classified.httpStatus === 403) {
      return { ...classified, isInvalidCredentials: true };
    }
    return { ...classified, isLoginFailed: true };
  }

  private isMt5BrokerError(err: unknown): err is Mt5BrokerError {
    return (
      typeof err === "object" &&
      err !== null &&
      ("httpStatus" in err || "isTimeout" in err || "isNetworkError" in err || "isBrokerOffline" in err || "isConnectionFailed" in err || "isLoginFailed" in err || "isInvalidCredentials" in err)
    );
  }

  private classifyThrown(err: unknown): Mt5BrokerError {
    if (this.isMt5BrokerError(err)) return err;
    return { isNetworkError: true, message: err instanceof Error ? err.message : "Unknown error" };
  }

  private extractMessage(body: unknown): string | undefined {
    if (typeof body !== "object" || body === null) return undefined;
    return (body as { message?: string }).message;
  }

  private isRetryableStatus(status?: number): boolean {
    return status === 502 || status === 503 || status === 504;
  }

  private async backoff(attempt: number): Promise<void> {
    await this.sleep(1_000 * 2 ** (attempt - 1));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Shows only the first 4 characters of a secret (session id) — enough to correlate log lines to a session during debugging, never enough to reuse. `password` is never passed to this method or logged anywhere, full stop. */
  private maskSecret(value: string): string {
    return value.length <= 4 ? "****" : `${value.slice(0, 4)}${"*".repeat(Math.max(0, value.length - 4))}`;
  }
}
