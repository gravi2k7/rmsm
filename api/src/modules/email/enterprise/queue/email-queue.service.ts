import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { EmailRetryService } from "../retry/email-retry.service";
import { EmailTrackerService } from "../tracking/email-tracker.service";
import { EmailErrorMapper } from "../errors/email-error-mapper";
import type { EnterpriseEmailMessage, EmailSendOptions, EmailQueueItem } from "../types/email-platform.types";
import type { EmailSendMode } from "../contracts/email-platform.contracts";

/**
 * EM-001's own Queue section: Immediate/Scheduled/Delayed send modes,
 * five queue states (Pending/Processing/Completed/Failed/Cancelled).
 *
 * "Immediate" is processed synchronously inline — `enqueue()` awaits the
 * send-with-retry before returning — which is what lets
 * `EnterpriseEmailService.send()` preserve the exact
 * await/throws-on-failure contract `EmailService.send()` (the interface
 * Authentication depends on) already has. "Scheduled"/"Delayed" return
 * as soon as the item is recorded PENDING; the actual send happens later
 * via `setTimeout`, with nobody left synchronously awaiting it — failures
 * there are logged and tracked, not thrown into a caller that has long
 * since moved on.
 *
 * In-memory only this milestone (a `Map`, not a persisted table or a
 * real broker like BullMQ/SQS) — EM-001 names no queue-persistence
 * requirement or database table, and BR-001 set the precedent for this
 * exact kind of explicit, named scope boundary ("no Prisma/database
 * layer this milestone") rather than guessing at unrequested
 * infrastructure.
 */
@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly items = new Map<string, EmailQueueItem>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly registry: EmailProviderRegistry,
    private readonly retry: EmailRetryService,
    private readonly tracker: EmailTrackerService,
    private readonly errorMapper: EmailErrorMapper,
    private readonly maxRetries: number,
    private readonly retryDelayMs: number,
  ) {}

  async enqueue(message: EnterpriseEmailMessage, options: EmailSendOptions = {}): Promise<EmailQueueItem> {
    const mode: EmailSendMode = options.mode ?? "IMMEDIATE";
    const item: EmailQueueItem = {
      id: randomUUID(),
      message,
      state: "PENDING",
      mode,
      scheduledAt: mode === "SCHEDULED" ? options.scheduledAt : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      correlationId: options.correlationId,
    };
    this.items.set(item.id, item);
    this.logger.log({ msg: "email.queue.enqueued", id: item.id, mode, correlationId: item.correlationId });

    if (mode === "IMMEDIATE") {
      await this.process(item.id);
      return this.mustGet(item.id);
    }

    const delayMs = mode === "SCHEDULED" ? Math.max(0, (options.scheduledAt?.getTime() ?? Date.now()) - Date.now()) : Math.max(0, options.delayMs ?? 0);
    const timer = setTimeout(() => {
      this.timers.delete(item.id);
      // Deferred (scheduled/delayed) processing has no caller left awaiting
      // it by the time this fires — `process()` already records the
      // failure via EmailTrackerService and transitions the item to
      // FAILED before rethrowing (for the IMMEDIATE-mode caller's
      // benefit); here that rethrow is deliberately swallowed so a
      // provider outage can never surface as an unhandled promise
      // rejection / crash the process.
      this.process(item.id).catch(() => undefined);
    }, delayMs);
    this.timers.set(item.id, timer);
    return item;
  }

  cancel(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.state !== "PENDING") return false;
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.updateItem(id, { state: "CANCELLED" });
    this.logger.log({ msg: "email.queue.cancelled", id });
    return true;
  }

  getItem(id: string): EmailQueueItem | undefined {
    return this.items.get(id);
  }

  listByState(state: EmailQueueItem["state"]): EmailQueueItem[] {
    return [...this.items.values()].filter((i) => i.state === state);
  }

  /** Used by `EmailHealthProvider`'s "Queue Status" check. */
  depth(): number {
    return this.listByState("PENDING").length + this.listByState("PROCESSING").length;
  }

  private async process(id: string): Promise<void> {
    const item = this.mustGet(id);
    this.updateItem(id, { state: "PROCESSING" });
    const startedAt = Date.now();
    const provider = this.registry.getActive();

    try {
      const result = await this.retry.executeWithRetry(
        () => {
          this.items.get(id)!.attempts += 1;
          return provider.send(item.message);
        },
        {
          maxRetries: this.maxRetries,
          retryDelayMs: this.retryDelayMs,
          isRetryable: (err) => this.errorMapper.isRetryable(this.errorMapper.classify(err)),
          operationName: `email.send[${id}]`,
        },
      );
      const processingTimeMs = Date.now() - startedAt;
      this.tracker.recordSent(result.providerMessageId, result.provider, this.mustGet(id).attempts - 1, processingTimeMs);
      this.updateItem(id, { state: "COMPLETED", result });
      this.logger.log({ msg: "email.queue.completed", id, provider: result.provider, processingTimeMs });
    } catch (err) {
      const processingTimeMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : String(err);
      this.tracker.recordFailed(id, provider.type, this.mustGet(id).attempts - 1, processingTimeMs, message);
      this.updateItem(id, { state: "FAILED", lastError: message });
      this.logger.warn({ msg: "email.queue.failed", id, error: message });
      throw err;
    }
  }

  private updateItem(id: string, patch: Partial<EmailQueueItem>): void {
    const current = this.mustGet(id);
    this.items.set(id, { ...current, ...patch, updatedAt: new Date() });
  }

  private mustGet(id: string): EmailQueueItem {
    const item = this.items.get(id);
    if (!item) throw new Error(`Email queue item "${id}" not found.`);
    return item;
  }
}
