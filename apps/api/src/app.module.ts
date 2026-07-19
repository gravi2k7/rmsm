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
import { BillingModule } from "./modules/billing/billing.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { MarketDataModule } from "./modules/market-data/market-data.module";
import { IndicatorEngineModule } from "./modules/indicator-engine/indicator-engine.module";
import { StrategyEngineModule } from "./modules/strategy-engine/strategy-engine.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { MarketApplicationModule } from "./application/market/market.module";
import { StrategyApplicationModule } from "./application/strategy/strategy.module";
import { OpportunityApplicationModule } from "./application/opportunity/opportunity.module";
import { DecisionApplicationModule } from "./application/decision/decision.module";
import { ExecutionApplicationModule } from "./application/execution/execution.module";
import { PortfolioApplicationModule } from "./application/portfolio/portfolio.module";

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
    MarketDataModule,
    IndicatorEngineModule,
    StrategyEngineModule,
    // Phase 4A — Enterprise API Platform. Full CQRS application layer for
    // the 6 business domains built earlier this program (Market,
    // Strategy, Opportunity, Decision, Execution, Portfolio) — each its
    // own self-contained module wiring an in-memory repository adapter
    // (see /apps/api/PERSISTENCE_ROADMAP.md) to CQRS commands/queries/
    // handlers and a REST controller. Deliberately separate modules per
    // domain, matching AI-101/AI-102/AI-103's own one-module-per-bounded-
    // context convention above, rather than one giant combined module.
    MarketApplicationModule,
    StrategyApplicationModule,
    OpportunityApplicationModule,
    DecisionApplicationModule,
    ExecutionApplicationModule,
    PortfolioApplicationModule,
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
