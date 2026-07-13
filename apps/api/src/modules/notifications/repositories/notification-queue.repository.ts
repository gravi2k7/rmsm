import { Injectable } from "@nestjs/common";
import { prisma, NotificationQueue, QueueStatus, NotificationPriority, DbClient } from "@rmsm/database";

export interface CreateQueueEntryInput {
  notificationId: string;
  queueName: string;
  priority?: NotificationPriority;
  scheduledFor?: Date;
  maxAttempts?: number;
}

/**
 * Durable companion to Module 001's BullMQ (ADR-017) — this repository
 * does not talk to Redis; QueueService (Phase 2c) keeps this table in
 * sync with the actual BullMQ job state.
 */
@Injectable()
export class NotificationQueueRepository {
  create(data: CreateQueueEntryInput, client: DbClient = prisma): Promise<NotificationQueue> {
    return client.notificationQueue.create({ data });
  }

  findByNotification(notificationId: string, client: DbClient = prisma): Promise<NotificationQueue[]> {
    return client.notificationQueue.findMany({ where: { notificationId } });
  }

  /** Priority-ordered, oldest-scheduled-first — the read primitive QueueService's worker loop pulls from. */
  findDueForProcessing(queueName: string, take: number, client: DbClient = prisma): Promise<NotificationQueue[]> {
    return client.notificationQueue.findMany({
      where: {
        queueName,
        status: "PENDING",
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take,
    });
  }

  updateStatus(id: string, status: QueueStatus, client: DbClient = prisma): Promise<NotificationQueue> {
    return client.notificationQueue.update({
      where: { id },
      data: { status, ...(status === "COMPLETED" || status === "FAILED" ? { processedAt: new Date() } : {}) },
    });
  }

  incrementAttempts(id: string, lastError: string, client: DbClient = prisma): Promise<NotificationQueue> {
    return client.notificationQueue.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError },
    });
  }

  moveToDeadLetter(id: string, reason: string, client: DbClient = prisma): Promise<NotificationQueue> {
    return client.notificationQueue.update({
      where: { id },
      data: { status: "DEAD_LETTER", lastError: reason, processedAt: new Date() },
    });
  }

  findDeadLetter(queueName: string, take: number, client: DbClient = prisma): Promise<NotificationQueue[]> {
    return client.notificationQueue.findMany({
      where: { queueName, status: "DEAD_LETTER" },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }
}
