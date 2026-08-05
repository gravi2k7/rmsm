import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { loadConfig } from "@rmsm/config";

/**
 * Global BullMQ connection setup. No queues/processors are registered yet —
 * per Module 001 scope ("No jobs yet"). Future modules register queues via
 * BullModule.registerQueue({ name: "..." }) against this shared connection.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => {
        const { REDIS_URL } = loadConfig();
        const url = new URL(REDIS_URL);

        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),

            username: url.username || undefined,
            password: url.password || undefined,

            // BullMQ recommended settings
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            lazyConnect: false,
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}