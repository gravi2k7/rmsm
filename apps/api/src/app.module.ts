import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { loadConfig } from "@rmsm/config";
import { AppConfigModule } from "./config/app-config.module";
import { QueueModule } from "./queue/queue.module";
import { HealthModule } from "./health/health.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

const { RATE_LIMIT_TTL_MS, RATE_LIMIT_MAX } = loadConfig();

/**
 * Root module. Module 001 scope: infrastructure only — config, queue,
 * health. Business modules (auth, users, signals, ...) attach here starting
 * Module 002 onward, one feature module at a time.
 */
@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([{ ttl: RATE_LIMIT_TTL_MS, limit: RATE_LIMIT_MAX }]),
    QueueModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
