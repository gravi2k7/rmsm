import { Injectable } from "@nestjs/common";
import { toInputJsonValue } from "@rmsm/shared";
import { prisma, NotificationSchedule, NotificationType, ScheduleFrequency, DbClient } from "@rmsm/database";

export interface CreateScheduleInput {
  organizationId: string;
  templateId: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  nextRunAt: Date;
  targetType: NotificationType;
  targetValue?: Record<string, unknown>;
  createdById?: string;
}

/** Phase 2c addition — deferred in Phase 2a, built now because its corresponding service (NotificationScheduler) is built this phase. */
@Injectable()
export class NotificationScheduleRepository {
  create(data: CreateScheduleInput, client: DbClient = prisma): Promise<NotificationSchedule> {
    return client.notificationSchedule.create({
      data: {
        ...data,
        targetValue: data.targetValue !== undefined ? toInputJsonValue(data.targetValue) : undefined,
      },
    });
  }

  findById(id: string, client: DbClient = prisma): Promise<NotificationSchedule | null> {
    return client.notificationSchedule.findFirst({ where: { id, deletedAt: null } });
  }

  /** The scheduler's primary read — every active schedule whose next run time has arrived. */
  findDueForRun(before: Date, client: DbClient = prisma): Promise<NotificationSchedule[]> {
    return client.notificationSchedule.findMany({
      where: { isActive: true, nextRunAt: { lte: before }, deletedAt: null },
    });
  }

  updateNextRun(id: string, nextRunAt: Date, lastRunAt: Date, client: DbClient = prisma): Promise<NotificationSchedule> {
    return client.notificationSchedule.update({ where: { id }, data: { nextRunAt, lastRunAt } });
  }

  deactivate(id: string, client: DbClient = prisma): Promise<NotificationSchedule> {
    return client.notificationSchedule.update({ where: { id }, data: { isActive: false } });
  }

  softDelete(id: string, client: DbClient = prisma): Promise<NotificationSchedule> {
    return client.notificationSchedule.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
