import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { loadConfig } from "@rmsm/config";

/**
 * Global BullMQ connection setup.
 * Future modules register queues via:
 * BullModule.registerQueue({ name: "..." })
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => {
  const { REDIS_URL } = loadConfig();

  const url = new URL(REDIS_URL);

  console.log("REDIS_URL:", REDIS_URL);
  console.log("PASSWORD RAW:", url.password);
  console.log("PASSWORD DECODED:", decodeURIComponent(url.password));

  return {
    connection: {
      host: url.hostname,
      port: Number(url.port || 6379),

      password: decodeURIComponent(url.password),

      enableReadyCheck: false,
      lazyConnect: false,
      maxRetriesPerRequest: null,
           
    },
  };
},
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}