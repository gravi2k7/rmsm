import { Injectable, Logger } from "@nestjs/common";
import { AuditService } from "../../auth/services/audit.service";
import { OrganizationSubscriptionRepository } from "../repositories/organization-subscription.repository";
import { LicenseService } from "../../licensing/services/license.service";

const TRIAL_REMINDER_WINDOW_DAYS = 3;

/**
 * Domain 2's "Renewals" / "Trial Management" sweep. Consumes the
 * PRE-EXISTING `OrganizationSubscriptionRepository.findTrialsEndingBefore`
 * (documented there as "for a scheduled job (Phase 3+)" — that job simply
 * never existed until now, a genuine gap this phase closes) plus
 * LicensingModule's expiry sweep. Runs on BullMQ's own repeatable-job
 * feature (see workers/billing-cron.registrar.ts), the same pattern
 * NotificationCronRegistrar already established (ADR-017) — not a second
 * scheduling mechanism.
 *
 * Scope boundary, named explicitly: this sweep audit-logs trials ending
 * soon; it does not itself send a reminder notification (resolving "who
 * to notify" for an organization — owner? every admin member? — is a
 * real product decision this prompt doesn't specify, and guessing at it
 * would risk emailing the wrong recipient). NotificationService (already
 * built, Domain 3) is the right integration point once that decision is
 * made — this sweep's audit log is the hook a future notification
 * trigger would read from.
 */
@Injectable()
export class RenewalService {
  private readonly logger = new Logger(RenewalService.name);

  constructor(
    private readonly subscriptionRepository: OrganizationSubscriptionRepository,
    private readonly licenseService: LicenseService,
    private readonly auditService: AuditService,
  ) {}

  async sweepTrialsEndingSoon(): Promise<number> {
    const cutoff = new Date(Date.now() + TRIAL_REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const trials = await this.subscriptionRepository.findTrialsEndingBefore(cutoff);

    for (const subscription of trials) {
      await this.auditService.log("billing.subscription.trial_ending_soon", {
        entityType: "OrganizationSubscription",
        entityId: subscription.id,
        metadata: { organizationId: subscription.organizationId, trialEndsAt: subscription.trialEndsAt },
      });
    }

    this.logger.log(`Renewal sweep: ${trials.length} trial(s) ending within ${TRIAL_REMINDER_WINDOW_DAYS} day(s).`);
    return trials.length;
  }

  async sweepExpiredLicenses(): Promise<number> {
    const count = await this.licenseService.expireOverdueLicenses();
    this.logger.log(`Renewal sweep: ${count} license(s) marked EXPIRED.`);
    return count;
  }
}
