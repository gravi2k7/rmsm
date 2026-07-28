import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsModule } from "../organizations/organizations.module";

// Repositories (Milestone 2)
import { StrategyRepository } from "./infrastructure/repositories/strategy.repository";
import { StrategyVersionRepository } from "./infrastructure/repositories/strategy-version.repository";
import { ExecutionProfileRepository } from "./infrastructure/repositories/execution-profile.repository";
import { StrategyValidationRepository } from "./infrastructure/repositories/strategy-validation.repository";
import { StrategyApprovalRepository } from "./infrastructure/repositories/strategy-approval.repository";
import { StrategyPublicationRepository } from "./infrastructure/repositories/strategy-publication.repository";
import { StrategyHistoryRepository } from "./infrastructure/repositories/strategy-history.repository";
import { CategoryRepository, TagRepository } from "./infrastructure/repositories/category-tag.repository";

// Application services (Milestone 3)
import { HistoryRecorderService } from "./application/services/history-recorder.service";
import { RuleTreeClonerService } from "./application/services/rule-tree-cloner.service";
import { StructuralValidationService } from "./application/services/structural-validation.service";

// Command handlers (Milestone 3)
import { CreateStrategyHandler } from "./application/commands/create-strategy.command";
import { UpdateStrategyHandler } from "./application/commands/update-strategy.command";
import { ArchiveStrategyHandler } from "./application/commands/archive-strategy.command";
import { CloneStrategyHandler } from "./application/commands/clone-strategy.command";
import { CreateVersionHandler } from "./application/commands/create-version.command";
import { ValidateVersionHandler } from "./application/commands/validate-version.command";
import { RequestApprovalHandler } from "./application/commands/request-approval.command";
import { DecideApprovalHandler } from "./application/commands/decide-approval.command";
import { PublishVersionHandler } from "./application/commands/publish-version.command";
import { RollbackVersionHandler } from "./application/commands/rollback-version.command";

// Query handlers (Milestone 3)
import { GetStrategyHandler } from "./application/queries/get-strategy.query";
import { ListStrategiesHandler } from "./application/queries/list-strategies.query";
import { GetVersionHandler } from "./application/queries/get-version.query";
import { ListVersionsHandler } from "./application/queries/list-versions.query";
import { ListCategoriesHandler } from "./application/queries/list-categories.query";
import { ListTagsHandler } from "./application/queries/list-tags.query";

// REST (Milestone 3)
import { StrategyController } from "./rest/strategy.controller";
import { StrategyVersionController } from "./rest/version.controller";

// Events & Integration (Milestone 4)
import { StrategyOutboxRepository } from "./infrastructure/repositories/strategy-outbox.repository";
import { OutboxEventPublisher } from "./infrastructure/events/outbox-event-publisher.service";
import { EVENT_PUBLISHER } from "./application/events/event-publisher.interface";
import { EventDispatcherService } from "./integration/dispatcher/event-dispatcher.service";
import { AuditEventHandler } from "./integration/handlers/audit-event.handler";
import { MetricsEventHandler } from "./integration/handlers/metrics-event.handler";
import { SearchIndexingHandler } from "./integration/handlers/search-indexing.handler";
import { AnalyticsHandler } from "./integration/handlers/analytics.handler";
import { NotificationPlaceholderHandler } from "./integration/handlers/notification-placeholder.handler";
import { StrategyEventMetricsService } from "./integration/services/strategy-event-metrics.service";
import { StrategyStructuredLogger } from "./integration/services/strategy-structured-logger.service";

/**
 * AI-103 Milestone 1: domain. Milestone 2: persistence. Milestone 3:
 * application layer and REST API. Milestone 4 (this update): events
 * and integration — a real outbox-pattern publisher
 * (`OutboxEventPublisher`, bound to `EVENT_PUBLISHER`, the interface
 * every command handler depends on — "Application publishes events.
 * Infrastructure delivers events," this milestone's own words), a
 * real background polling worker (`OutboxPublisherService`), a real
 * event dispatcher fanning out to 5 real handlers (Audit — reusing the
 * platform's own existing `AuditService`; Metrics; and 3 honest
 * placeholders: SearchIndexing, Analytics, Notification).
 *
 * Imports `AuthModule` (PermissionsGuard/CurrentUser/AuditService) and
 * `OrganizationsModule` (OrganizationRoleGuard) — unchanged since
 * Milestone 3.
 */
@Module({
  imports: [AuthModule, OrganizationsModule],
  controllers: [StrategyController, StrategyVersionController],
  providers: [
    // Repositories
    StrategyRepository,
    StrategyVersionRepository,
    ExecutionProfileRepository,
    StrategyValidationRepository,
    StrategyApprovalRepository,
    StrategyPublicationRepository,
    StrategyHistoryRepository,
    CategoryRepository,
    TagRepository,
    StrategyOutboxRepository,
    // Application services
    HistoryRecorderService,
    RuleTreeClonerService,
    StructuralValidationService,
    // Command handlers
    CreateStrategyHandler,
    UpdateStrategyHandler,
    ArchiveStrategyHandler,
    CloneStrategyHandler,
    CreateVersionHandler,
    ValidateVersionHandler,
    RequestApprovalHandler,
    DecideApprovalHandler,
    PublishVersionHandler,
    RollbackVersionHandler,
    // Query handlers
    GetStrategyHandler,
    ListStrategiesHandler,
    GetVersionHandler,
    ListVersionsHandler,
    ListCategoriesHandler,
    ListTagsHandler,
    // Events & integration (Milestone 4)
    { provide: EVENT_PUBLISHER, useClass: OutboxEventPublisher },
    //OutboxPublisherService,
    EventDispatcherService,
    AuditEventHandler,
    MetricsEventHandler,
    SearchIndexingHandler,
    AnalyticsHandler,
    NotificationPlaceholderHandler,
    StrategyEventMetricsService,
    StrategyStructuredLogger,
  ],
  exports: [StrategyRepository, StrategyVersionRepository],
})
export class StrategyEngineModule {}
