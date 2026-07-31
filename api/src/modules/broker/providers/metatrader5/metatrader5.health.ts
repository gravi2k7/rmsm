import { Injectable, Logger } from "@nestjs/common";
import type { BrokerHealthProvider } from "../../interfaces/broker-health-provider.interface";
import type { BrokerHealthSnapshot } from "../../interfaces/broker-models";
import type { BrokerHealthStatus } from "../../contracts/broker.contracts";
import { MetaTrader5Client } from "./metatrader5.client";
import { MetaTrader5SessionManager } from "./metatrader5.session-manager";
import { MetaTrader5ErrorMapper } from "./metatrader5.error-mapper";

/**
 * BR-001's Health Provider section: Connected, Session Valid, Ping,
 * Broker Reachable, Terminal Available — all five reflected on one
 * `BrokerHealthSnapshot` (connected/sessionValid/status/message). Never
 * throws — a failed probe is reported AS a snapshot, matching every
 * `HealthProvider` since MD-001 (independently reimplemented for this
 * domain, not imported — see this module's `contracts/broker.contracts.ts`).
 */
@Injectable()
export class MetaTrader5HealthProvider implements BrokerHealthProvider {
  private readonly logger = new Logger(MetaTrader5HealthProvider.name);

  constructor(
    private readonly client: MetaTrader5Client,
    private readonly sessionManager: MetaTrader5SessionManager,
    private readonly errorMapper: MetaTrader5ErrorMapper,
  ) {}

  async checkHealth(): Promise<BrokerHealthSnapshot> {
    const startedAt = Date.now();
    const sessionValid = this.sessionManager.isSessionValid();

    try {
      const ping = await this.client.ping();
      const latencyMs = Date.now() - startedAt;
      const connected = this.client.isConnected() && ping.connected;
      const status = this.toStatus(connected, sessionValid, ping.terminalAvailable);
      this.logger.log({ msg: "mt5.health.ok", connected, sessionValid, terminalAvailable: ping.terminalAvailable, latencyMs });
      return {
        status,
        connected,
        sessionValid,
        latencyMs,
        lastCheckedAt: new Date(),
        message: this.buildMessage(connected, sessionValid, ping.terminalAvailable),
      };
    } catch (err) {
      const classification = this.errorMapper.classify(err);
      const status = this.toOutageClassification(classification);
      this.logger.warn({ msg: "mt5.health.failed", classification });
      return {
        status,
        connected: false,
        sessionValid,
        latencyMs: Date.now() - startedAt,
        lastCheckedAt: new Date(),
        message: `MT5 health check failed: ${classification}`,
      };
    }
  }

  private toStatus(connected: boolean, sessionValid: boolean, terminalAvailable: boolean): BrokerHealthStatus {
    if (!connected || !terminalAvailable) return "down";
    if (!sessionValid) return "degraded";
    return "healthy";
  }

  private toOutageClassification(classification: ReturnType<MetaTrader5ErrorMapper["classify"]>): BrokerHealthStatus {
    if (classification === "broker_offline" || classification === "connection_failed" || classification === "network_error") return "down";
    if (classification === "timeout" || classification === "session_expired") return "degraded";
    return "unknown";
  }

  private buildMessage(connected: boolean, sessionValid: boolean, terminalAvailable: boolean): string {
    return `connected=${connected} sessionValid=${sessionValid} terminalAvailable=${terminalAvailable}`;
  }
}
