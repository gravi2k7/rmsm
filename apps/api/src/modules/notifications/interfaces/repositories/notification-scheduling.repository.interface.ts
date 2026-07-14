import type {
  DbClient,
  NotificationQueue,
  NotificationSchedule,
  NotificationDigest,
  QueueStatus,
} from "@rmsm/database";

export interface INotificationQueueRepository {
  create(data: Partial<NotificationQueue>, client?: DbClient): Promise<NotificationQueue>;
  findByNotification(notificationId: string, client?: DbClient): Promise<NotificationQueue[]>;
  findDueForProcessing(queueName: string, take: number, client?: DbClient): Promise<NotificationQueue[]>;
  updateStatus(id: string, status: QueueStatus, client?: DbClient): Promise<NotificationQueue>;
  findDeadLetter(queueName: string, client?: DbClient): Promise<NotificationQueue[]>;
}

export interface INotificationScheduleRepository {
  create(data: Partial<NotificationSchedule>, client?: DbClient): Promise<NotificationSchedule>;
  findDueForRun(before: Date, client?: DbClient): Promise<NotificationSchedule[]>;
  updateNextRun(id: string, nextRunAt: Date, lastRunAt: Date, client?: DbClient): Promise<NotificationSchedule>;
  deactivate(id: string, client?: DbClient): Promise<NotificationSchedule>;
}

export interface INotificationDigestRepository {
  create(data: Partial<NotificationDigest>, client?: DbClient): Promise<NotificationDigest>;
  findByUser(userId: string, organizationId: string, client?: DbClient): Promise<NotificationDigest[]>;
  findDueForSend(before: Date, client?: DbClient): Promise<NotificationDigest[]>;
  updateLastSent(id: string, sentAt: Date, nextScheduledAt: Date, client?: DbClient): Promise<NotificationDigest>;
}
