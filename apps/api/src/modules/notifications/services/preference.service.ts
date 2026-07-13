import { Injectable } from "@nestjs/common";
import { NotificationChannel, NotificationPreference } from "@rmsm/database";
import {
  NotificationPreferenceRepository,
} from "../repositories/notification-preference.repository";

export interface PreferenceDecision {
  allowed: boolean;
  redirectToDigest: boolean;
  reason?: string;
}

/**
 * Resolution order for "does this user want this notification right
 * now": exact (category+channel) match wins over either single-field
 * wildcard, which wins over the full (both-null) wildcard. No matching
 * preference row at all defaults to allowed — this is an opt-out model
 * (notifications on by default, users turn specific ones off), not
 * opt-in, matching typical product notification UX.
 */
@Injectable()
export class PreferenceService {
  constructor(private readonly preferenceRepository: NotificationPreferenceRepository) {}

  async isAllowed(
    userId: string,
    organizationId: string,
    categoryId: string | undefined,
    channel: NotificationChannel,
  ): Promise<PreferenceDecision> {
    const candidates = await this.preferenceRepository.findApplicable(
      userId,
      organizationId,
      categoryId ?? null,
      channel,
    );

    const match = this.mostSpecific(candidates, categoryId ?? null, channel);
    if (!match) {
      return { allowed: true, redirectToDigest: false };
    }

    if (!match.enabled) {
      return { allowed: false, redirectToDigest: false, reason: "opted_out" };
    }

    if (this.isWithinQuietHours(match)) {
      return { allowed: false, redirectToDigest: false, reason: "quiet_hours" };
    }

    if (match.digestFrequency) {
      return { allowed: false, redirectToDigest: true, reason: "digest_redirect" };
    }

    return { allowed: true, redirectToDigest: false };
  }

  async setPreference(
    userId: string,
    organizationId: string,
    categoryId: string | null,
    channel: NotificationChannel | null,
    enabled: boolean,
  ): Promise<void> {
    await this.preferenceRepository.upsert({ userId, organizationId, categoryId, channel, enabled });
  }

  /** A coarse summary — every category/channel combination this org's users have collectively disabled, useful for an admin dashboard's "your users are muting X" view. Not exposed as a controller endpoint this phase; kept here since PreferenceService, not a future service, owns this data. */
  async getOrganizationDefaults(_organizationId: string): Promise<Record<string, boolean>> {
    // Deliberately minimal for this phase: no repository method exists yet
    // to aggregate across all users in an organization (that's a
    // different query shape than findByUser/findApplicable, which are
    // both single-user lookups) — returning an empty object rather than
    // fabricating aggregate data is more honest than a wrong answer.
    // A real implementation needs a dedicated repository aggregation
    // method once this becomes a real product requirement (e.g. driving
    // an actual admin dashboard), not guessed at speculatively here.
    return {};
  }

  private mostSpecific(
    candidates: NotificationPreference[],
    categoryId: string | null,
    channel: NotificationChannel,
  ): NotificationPreference | undefined {
    return (
      candidates.find((p) => p.categoryId === categoryId && p.channel === channel) ??
      candidates.find((p) => p.categoryId === categoryId && p.channel === null) ??
      candidates.find((p) => p.categoryId === null && p.channel === channel) ??
      candidates.find((p) => p.categoryId === null && p.channel === null)
    );
  }

  private isWithinQuietHours(preference: NotificationPreference): boolean {
    if (!preference.quietHoursStart || !preference.quietHoursEnd) return false;

    const now = new Date();
    const userNow = new Date(now.toLocaleString("en-US", { timeZone: preference.timezone }));
    const currentMinutes = userNow.getHours() * 60 + userNow.getMinutes();

    const [startH, startM] = preference.quietHoursStart.split(":").map(Number);
    const [endH, endM] = preference.quietHoursEnd.split(":").map(Number);
    if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) return false;

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Quiet hours can wrap past midnight (e.g. 22:00–07:00).
    return startMinutes <= endMinutes
      ? currentMinutes >= startMinutes && currentMinutes < endMinutes
      : currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}
