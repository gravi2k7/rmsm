import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import { NotificationSchedule } from "@rmsm/database";
import { AuditService } from "../../auth/services/audit.service";
import { NotificationScheduleRepository, CreateScheduleInput } from "../repositories/notification-schedule.repository";
import { NotificationTemplateRepository } from "../repositories/notification-template.repository";
import { NotificationService } from "./notification.service";

const FREQUENCY_INTERVAL_MS: Record<string, number> = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};

export interface ScheduleTargetValue {
  channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP" | "WEBHOOK";
  recipientUserId?: string;
  recipientRole?: string;
  recipientPermission?: string;
  topic?: string;
  variables?: Record<string, unknown>;
}

/**
 * Evaluates every active NotificationSchedule whose nextRunAt has passed,
 * sends the corresponding notification via NotificationService, and
 * advances (or deactivates, for ONCE) the schedule. Intended to run as a
 * BullMQ repeatable job (Developer Guide's deployment note) — this
 * service is the logic that job calls, not the job-scheduling
 * infrastructure itself.
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly scheduleRepository: NotificationScheduleRepository,
    private readonly templateRepository: NotificationTemplateRepository,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  async processDueSchedules(before: Date): Promise<{ processed: number; failed: number }> {
    const dueSchedules = await this.scheduleRepository.findDueForRun(before);
    let processed = 0;
    let failed = 0;

    for (const schedule of dueSchedules) {
      try {
        await this.fireSchedule(schedule);
        await this.advanceSchedule(schedule);
        processed += 1;
      } catch (error) {
        this.logger.error(`Failed to process schedule ${schedule.id}: ${error instanceof Error ? error.message : String(error)}`);
        failed += 1;
      }
    }

    return { processed, failed };
  }

  private async fireSchedule(schedule: NotificationSchedule): Promise<void> {
    const template = await this.templateRepository.findById(schedule.templateId);
    if (!template) throw new NotFoundError("NotificationTemplate", schedule.templateId);

    const target = schedule.targetValue as unknown as ScheduleTargetValue;
    await this.notificationService.send({
      organizationId: schedule.organizationId,
      type: schedule.targetType,
      channel: target.channel,
      templateKey: template.key,
      recipientUserId: target.recipientUserId,
      recipientRole: target.recipientRole,
      recipientPermission: target.recipientPermission,
      topic: target.topic,
      variables: target.variables,
      actorId: schedule.createdById,
    });
  }

  private async advanceSchedule(schedule: NotificationSchedule): Promise<void> {
    const now = new Date();
    if (schedule.frequency === "ONCE") {
      await this.scheduleRepository.deactivate(schedule.id);
      return;
    }

    const intervalMs = FREQUENCY_INTERVAL_MS[schedule.frequency];
    if (!intervalMs) {
      // CUSTOM_CRON needs real cron-expression evaluation, which this
      // service doesn't implement (no cron-parsing library — consistent
      // with this module's "no vendor library for something implementable
      // directly" pattern, but cron parsing is a genuinely large
      // undertaking to hand-roll correctly). Deactivated with a clear log
      // rather than silently never firing again — a real, named gap, not
      // a silent one.
      this.logger.warn(`Schedule ${schedule.id} uses CUSTOM_CRON, which is not yet evaluated — deactivating rather than looping incorrectly.`);
      await this.scheduleRepository.deactivate(schedule.id);
      return;
    }

    await this.scheduleRepository.updateNextRun(schedule.id, new Date(now.getTime() + intervalMs), now);
  }

  async createSchedule(data: CreateScheduleInput, actorId: string): Promise<NotificationSchedule> {
    const template = await this.templateRepository.findById(data.templateId);
    if (!template) throw new NotFoundError("NotificationTemplate", data.templateId);

    const schedule = await this.scheduleRepository.create({ ...data, createdById: actorId });
    await this.auditService.log("notification.schedule.created", {
      userId: actorId,
      entityType: "NotificationSchedule",
      entityId: schedule.id,
      metadata: { frequency: data.frequency },
    });
    return schedule;
  }

  async cancelSchedule(id: string): Promise<void> {
    await this.scheduleRepository.deactivate(id);
  }
}
