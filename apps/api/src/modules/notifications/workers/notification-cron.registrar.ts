import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

/**
 * Registers BullMQ's native repeatable-job feature for the two periodic
 * sweeps this module needs (schedule processing, digest sending) — using
 * BullMQ's own repeat option rather than adding `@nestjs/schedule` as a
 * new dependency, since the queue infrastructure this relies on
 * (Module 001's QueueModule) already supports it natively (ADR-017: this
 * module is a companion to BullMQ, not a second system). Runs once at
 * application startup; BullMQ deduplicates repeatable jobs with the same
 * key, so restarting the app doesn't create duplicate schedules.
 */
@Injectable()
export class NotificationCronRegistrar implements OnModuleInit {
  private readonly logger = new Logger(NotificationCronRegistrar.name);

  constructor(
    @InjectQueue("scheduled")
    private readonly scheduledQueue: Queue,

    @InjectQueue("digest")
    private readonly digestQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.scheduledQueue.add(
      "sweep-schedules",
      {},
      {
        repeat: { every: 60_000 },
        jobId: "sweep-schedules-repeatable",
      },
    );

    await this.digestQueue.add(
      "sweep-digests",
      {},
      {
        repeat: { every: 60 * 60_000 },
        jobId: "sweep-digests-repeatable",
      },
    );

    this.logger.log(
      "Registered repeatable sweep jobs: schedules every 60s, digests every 60m.",
    );
  }
}