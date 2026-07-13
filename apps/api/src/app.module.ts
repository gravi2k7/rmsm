import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { loadConfig } from "@rmsm/config";
import { AppConfigModule } from "./config/app-config.module";
import { QueueModule } from "./queue/queue.module";
import { HealthModule } from "./health/health.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { EmailModule } from "./modules/email/email.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { OAuthModule } from "./modules/oauth/oauth.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { BillingModule } from "./modules/billing/billing.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";

const { RATE_LIMIT_TTL_MS, RATE_LIMIT_MAX } = loadConfig();

/**
 * Root module. Module 002 adds the full IAM stack (Auth, Users/Profile,
 * RBAC, OAuth, Email) on top of Module 001's infrastructure. JwtAuthGuard
 * is now global — every endpoint requires auth by default; use @Public()
 * to opt out (see auth/decorators/public.decorator.ts).
 */
@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([{ ttl: RATE_LIMIT_TTL_MS, limit: RATE_LIMIT_MAX }]),
    QueueModule,
    HealthModule,
    EmailModule,
    AuthModule,
    UsersModule,
    RbacModule,
    OAuthModule,
    OrganizationsModule,
    BillingModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
