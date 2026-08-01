import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { loadConfig } from "@rmsm/config";
import { AppConfigModule } from "./config/app-config.module";
import { QueueModule } from "./queue/queue.module";
import { HealthModule } from "./health/health.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { EmailModule } from "./modules/email/email.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { OAuthModule } from "./modules/oauth/oauth.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { OrganizationDashboardModule } from "./modules/organizations/dashboard/organization-dashboard.module";
import { BillingModule } from "./modules/billing/billing.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { MarketDataModule } from "./modules/market-data/market-data.module";
import { BrokerModule } from "./modules/broker/broker.module";
import { IndicatorEngineModule } from "./modules/indicator-engine/indicator-engine.module";
import { StrategyEngineModule } from "./modules/strategy-engine/strategy-engine.module";
import { AiModule } from "./modules/ai/ai.module";
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
    // Module 003: depends on both OrganizationsModule and BillingModule
    // (which itself depends on OrganizationsModule) — must be registered
    // after both so Nest's module graph resolves without ambiguity.
    OrganizationDashboardModule,
    NotificationsModule,
    MarketDataModule,
    BrokerModule,
    IndicatorEngineModule,
    StrategyEngineModule,
    AiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // First middleware in the chain, deliberately — every other
    // middleware/interceptor/filter (LoggingInterceptor,
    // GlobalExceptionFilter) reads req.requestId, so it must exist
    // before any of them run. Applied to every route ("*"), including
    // @Public() ones — an unauthenticated request that fails is exactly
    // the kind of thing a correlation id most needs to help debug.
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
