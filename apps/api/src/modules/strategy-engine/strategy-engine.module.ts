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

/**
 * AI-103 Milestone 1: domain (aggregates/entities/value-objects/
 * contracts — no NestJS providers at all, pure TypeScript). Milestone
 * 2: persistence (9 real repositories, this module's own first set of
 * registered providers). Milestone 3 (this file, genuinely new): the
 * application layer and REST API — hand-rolled CQRS command/query
 * handlers (see `create-strategy.command.ts`'s own header comment for
 * why not `@nestjs/cqrs`), 2 controllers.
 *
 * Imports `AuthModule` (PermissionsGuard/CurrentUser) and
 * `OrganizationsModule` (OrganizationRoleGuard, which itself depends
 * on `OrganizationMembershipRepository`) — the two-guard organization-
 * scoping pattern this milestone's own controllers use throughout, per
 * this milestone's own "integrate existing Organization Context" rule.
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
  ],
  exports: [StrategyRepository, StrategyVersionRepository],
})
export class StrategyEngineModule {}
