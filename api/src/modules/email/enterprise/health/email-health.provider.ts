import { Injectable, Logger } from "@nestjs/common";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { EmailQueueService } from "../queue/email-queue.service";
import { EmailTrackerService } from "../tracking/email-tracker.service";
import type { EmailHealthSnapshot } from "../types/email-platform.types";
import type { EmailHealthStatus } from "../contracts/email-platform.contracts";

const DEGRADED_QUEUE_DEPTH = 50;
const DEGRADED_FAILURE_RATE = 0.25;

/**
 * EM-001's own Health Provider section: "Verify: SMTP Connection,
 * Provider Status, Queue Status." `SMTP Connection` and `Provider
 * Status` collapse into one check here — `EmailProvider.verifyConnection()`
 * IS each provider's own connection/status probe (an SMTP handshake for
 * `SMTPEmailProvider`, a lightweight authenticated API call for
 * `ResendEmailProvider`, an always-true no-op for `ConsoleEmailProvider`)
 * — while `Queue Status` reads `EmailQueueService.depth()` and
 * `EmailTrackerService.recentFailureRate()`. Never throws — a failed
 * probe is reported AS a snapshot, the same discipline every
 * `HealthProvider` since MD-001/BR-001 has used.
 */
@Injectable()
export class EmailHealthProvider {
  private readonly logger = new Logger(EmailHealthProvider.name);

  constructor(
    private readonly registry: EmailProviderRegistry,
    private readonly queue: EmailQueueService,
    private readonly tracker: EmailTrackerService,
  ) {}

  async checkHealth(): Promise<EmailHealthSnapshot> {
    const active = this.registry.getActive();
    const connectionOk = await active.verifyConnection().catch(() => false);
    const queueDepth = this.queue.depth();
    const recentFailureRate = this.tracker.recentFailureRate();
    const status = this.toStatus(connectionOk, queueDepth, recentFailureRate);

    this.logger.log({ msg: "email.health.checked", provider: active.type, connectionOk, queueDepth, recentFailureRate, status });

    return {
      status,
      provider: active.type,
      connectionOk,
      queueDepth,
      recentFailureRate,
      lastCheckedAt: new Date(),
      message: `provider=${active.type} connectionOk=${connectionOk} queueDepth=${queueDepth} recentFailureRate=${recentFailureRate.toFixed(2)}`,
    };
  }

  private toStatus(connectionOk: boolean, queueDepth: number, recentFailureRate: number): EmailHealthStatus {
    if (!connectionOk) return "down";
    if (queueDepth > DEGRADED_QUEUE_DEPTH || recentFailureRate > DEGRADED_FAILURE_RATE) return "degraded";
    return "healthy";
  }
}
