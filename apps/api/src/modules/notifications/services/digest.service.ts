import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import { NotificationDigest, ScheduleFrequency } from "@rmsm/database";
import { NotificationDigestRepository } from "../repositories/notification-digest.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationService } from "./notification.service";

const FREQUENCY_INTERVAL_MS: Record<string, number> = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // same value as FREQUENCY_INTERVAL_MS.DAILY, kept as a literal so it's never itself subject to the Record-indexing-is-possibly-undefined issue this helper exists to resolve

/** Record<string, number> index access is `number | undefined` under this project's noUncheckedIndexedAccess — this is the one place that fact is resolved, rather than repeating a fallback (itself also possibly-undefined without this helper) at every call site. */
function resolveIntervalMs(frequency: string): number {
  return FREQUENCY_INTERVAL_MS[frequency] ?? DEFAULT_INTERVAL_MS;
}

/**
 * Aggregates every notification a user would otherwise have received
 * individually (per NotificationPreference.digestFrequency redirects —
 * PreferenceService) into one digest send. Only builds and sends the
 * digest; does not re-check preferences, since the individual
 * notifications were already redirected here specifically *because*
 * PreferenceService decided so at their own send time.
 */
@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly digestRepository: NotificationDigestRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async buildDigest(digestId: string): Promise<{ subject: string; body: string; itemCount: number }> {
    const digest = await this.digestRepository.findById(digestId);
    if (!digest) throw new NotFoundError("NotificationDigest", digestId);
    return this.buildDigestContent(digest);
  }

  async processDueDigests(before: Date): Promise<{ sent: number; skipped: number }> {
    const dueDigests = await this.digestRepository.findDueForSend(before);
    let sent = 0;
    let skipped = 0;

    for (const digest of dueDigests) {
      try {
        const { subject, body, itemCount } = await this.buildDigestContent(digest);
        const now = new Date();
        const nextScheduledAt = new Date(now.getTime() + resolveIntervalMs(digest.frequency));

        if (itemCount === 0) {
          await this.digestRepository.updateLastSent(digest.id, now, nextScheduledAt);
          skipped += 1;
          continue;
        }

        // actorId: null — this is a system-initiated send, not a user
        // action; never a fake string, per the same fix applied to
        // NotificationScheduler.
        await this.notificationService.send({
          organizationId: digest.organizationId,
          type: "DIGEST",
          channel: "EMAIL",
          recipientUserId: digest.userId,
          subject,
          body,
          actorId: null,
        });
        await this.digestRepository.updateLastSent(digest.id, now, nextScheduledAt);
        sent += 1;
      } catch (error) {
        this.logger.error(`Failed to process digest ${digest.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { sent, skipped };
  }

  async subscribe(
    userId: string,
    organizationId: string,
    categoryKeys: string[],
    frequency: ScheduleFrequency,
  ): Promise<NotificationDigest> {
    const nextScheduledAt = new Date(Date.now() + resolveIntervalMs(frequency));
    return this.digestRepository.upsert({ userId, organizationId, frequency, categoryKeys, nextScheduledAt });
  }

  /**
   * Only includes notifications specifically suppressed with
   * `suppressionReason: "digest_redirect"` (set by NotificationService —
   * see that file's comment) — a genuinely opted-out notification
   * (`suppressionReason: "opted_out"`) is excluded, since a digest
   * shouldn't resurrect something the user explicitly turned off.
   */
  private async buildDigestContent(
    digest: NotificationDigest,
  ): Promise<{ subject: string; body: string; itemCount: number }> {
    const since = digest.lastSentAt ?? new Date(0);
    const candidates = await this.notificationRepository.findByRecipient(
      digest.userId,
      digest.organizationId,
      { status: "CANCELLED" },
      { take: 200, skip: 0 },
    );

    const items = candidates.filter((n) => {
      if (n.createdAt <= since) return false;
      const data = n.data as unknown as { suppressionReason?: string } | null;
      return data?.suppressionReason === "digest_redirect";
    });

    const subject = `Your digest: ${items.length} update${items.length === 1 ? "" : "s"}`;
    const body = items.map((n) => `<p><strong>${n.subject ?? ""}</strong><br/>${n.body}</p>`).join("\n");
    return { subject, body, itemCount: items.length };
  }
}
