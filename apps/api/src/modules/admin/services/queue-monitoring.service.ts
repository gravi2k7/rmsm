import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

export interface QueueSnapshot {
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number };
  isPaused: boolean;
}

/**
 * Domain 1's Queue Monitoring / Background Job Monitoring / Scheduler
 * Dashboard — reads BullMQ's own native `getJobCounts()` against the
 * queues Module 001's QueueModule + the Notifications module already
 * registered (email/sms/push/digest/scheduled). No new queue
 * infrastructure, no polling loop of our own — BullMQ already tracks
 * this; this service is a thin, read-only view over it.
 */
@Injectable()
export class QueueMonitoringService {
  constructor(
    @InjectQueue("email") private readonly emailQueue: Queue,
    @InjectQueue("sms") private readonly smsQueue: Queue,
    @InjectQueue("push") private readonly pushQueue: Queue,
    @InjectQueue("digest") private readonly digestQueue: Queue,
    @InjectQueue("scheduled") private readonly scheduledQueue: Queue,
  ) {}

  private get queues(): { name: string; queue: Queue }[] {
    return [
      { name: "email", queue: this.emailQueue },
      { name: "sms", queue: this.smsQueue },
      { name: "push", queue: this.pushQueue },
      { name: "digest", queue: this.digestQueue },
      { name: "scheduled", queue: this.scheduledQueue },
    ];
  }

  async getAllQueueSnapshots(): Promise<QueueSnapshot[]> {
    return Promise.all(
      this.queues.map(async ({ name, queue }) => {
        const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
        const isPaused = await queue.isPaused();
        return {
          name,
          counts: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            paused: counts.paused ?? 0,
          },
          isPaused,
        };
      }),
    );
  }

  async getQueueSnapshot(name: string): Promise<QueueSnapshot | null> {
    const entry = this.queues.find((q) => q.name === name);
    if (!entry) return null;
    const counts = await entry.queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
    const isPaused = await entry.queue.isPaused();
    return {
      name,
      counts: {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
        paused: counts.paused ?? 0,
      },
      isPaused,
    };
  }

  /** Scheduler Dashboard — BullMQ's own repeatable-job registry (NotificationCronRegistrar's sweep jobs, and this module's own renewal sweep — see billing/services/renewal.service.ts). */
  async getRepeatableJobs(): Promise<{ queue: string; jobs: { name: string; pattern: string | null; next: number | null }[] }[]> {
    return Promise.all(
      this.queues.map(async ({ name, queue }) => {
        const repeatables = await queue.getRepeatableJobs();
        return {
          queue: name,
          jobs: repeatables.map((r) => ({ name: r.name, pattern: r.pattern ?? null, next: r.next ?? null })),
        };
      }),
    );
  }
}
