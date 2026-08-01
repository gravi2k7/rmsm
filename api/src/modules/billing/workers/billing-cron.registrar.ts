import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

/** Registers the daily renewal sweep — same BullMQ-native repeatable-job pattern as NotificationCronRegistrar (ADR-017), applied to Domain 2's own queue. */
@Injectable()
export class BillingCronRegistrar implements OnModuleInit {
  private readonly logger = new Logger(BillingCronRegistrar.name);

  constructor(@InjectQueue("billing-renewal") private readonly renewalQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.renewalQueue.add(
      "sweep-renewals",
      {},
      { repeat: { every: 24 * 60 * 60_000 }, jobId: "sweep-renewals-repeatable" },
    );
    this.logger.log("Registered repeatable sweep job: billing renewals every 24h.");
  }
}
