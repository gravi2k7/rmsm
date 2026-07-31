import { Injectable, Logger } from "@nestjs/common";
import type { BrokerConnectionManager } from "../../interfaces/broker-connection-manager.interface";
import type { BrokerConnectionHealth } from "../../interfaces/broker-models";
import { MetaTrader5Client } from "./metatrader5.client";
import { MetaTrader5ErrorMapper } from "./metatrader5.error-mapper";

/**
 * BR-001's Connection Manager section: Connect, Disconnect, Auto
 * Reconnect, Retry Strategy, Connection Health, Session Timeout.
 * Wraps `MetaTrader5Client`'s connect/disconnect/reconnect/ping — this
 * class owns the RETRY POLICY around those calls (exponential backoff,
 * capped at `maxRetry` attempts), while `MetaTrader5Client.request()`
 * separately retries individual gateway calls; the two are deliberately
 * different concerns at different layers: one retries "is the broker
 * connection itself up," the other retries "did this one API call
 * transiently fail."
 */
@Injectable()
export class MetaTrader5ConnectionManager implements BrokerConnectionManager {
  private readonly logger = new Logger(MetaTrader5ConnectionManager.name);
  private lastConnectedAt: Date | undefined;
  private lastLatencyMs: number | undefined;

  constructor(
    private readonly client: MetaTrader5Client,
    private readonly errorMapper: MetaTrader5ErrorMapper,
    private readonly maxRetry: number,
    /** `MT5_RECONNECT` (BR-001's own Configuration example) — when `false`, `autoReconnect()` logs and returns without attempting a reconnect, rather than silently retrying forever against a deployment that deliberately wants a dropped connection to stay dropped (e.g. during planned maintenance). */
    private readonly reconnectEnabled: boolean = true,
  ) {}

  async connect(): Promise<void> {
    await this.connectWithRetry();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  getConnectionHealth(): BrokerConnectionHealth {
    return {
      status: this.client.getConnectionStatus(),
      lastConnectedAt: this.lastConnectedAt,
      latencyMs: this.lastLatencyMs,
    };
  }

  /** Auto-reconnect entry point — called by `MetaTrader5HealthProvider`/the heartbeat failure handler when the connection is found to be down. Retries `connect()` with exponential backoff up to `maxRetry` times before giving up, rather than a single attempt. */
  async autoReconnect(): Promise<void> {
    if (!this.reconnectEnabled) {
      this.logger.log({ msg: "mt5.connection.auto_reconnect.disabled" });
      return;
    }
    this.logger.log({ msg: "mt5.connection.auto_reconnect.start" });
    try {
      await this.client.reconnect();
      this.lastConnectedAt = new Date();
      this.logger.log({ msg: "mt5.connection.auto_reconnect.ok" });
    } catch (err) {
      const classification = this.errorMapper.classify(err);
      this.logger.warn({ msg: "mt5.connection.auto_reconnect.failed", classification });
      throw err;
    }
  }

  private async connectWithRetry(): Promise<void> {
    const attempts = this.maxRetry + 1;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const startedAt = Date.now();
      try {
        await this.client.connect();
        this.lastConnectedAt = new Date();
        this.lastLatencyMs = Date.now() - startedAt;
        return;
      } catch (err) {
        lastErr = err;
        const classification = this.errorMapper.classify(err);
        const retryable = this.errorMapper.isRetryable(classification);
        const isFinalAttempt = attempt === attempts;
        this.logger.warn({ msg: "mt5.connection.connect.failed", attempt, of: attempts, classification });
        if (isFinalAttempt || !retryable) throw err;
        await this.sleep(1_000 * 2 ** (attempt - 1));
      }
    }
    throw lastErr;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
