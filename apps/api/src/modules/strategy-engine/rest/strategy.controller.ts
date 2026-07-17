import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, UseFilters, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CreateStrategyHandler, CreateStrategyCommand } from "../application/commands/create-strategy.command";
import { UpdateStrategyHandler, UpdateStrategyCommand } from "../application/commands/update-strategy.command";
import { ArchiveStrategyHandler, ArchiveStrategyCommand } from "../application/commands/archive-strategy.command";
import { CloneStrategyHandler, CloneStrategyCommand } from "../application/commands/clone-strategy.command";
import { CreateVersionHandler, CreateVersionCommand } from "../application/commands/create-version.command";
import { PublishVersionHandler, PublishVersionCommand } from "../application/commands/publish-version.command";
import { GetStrategyHandler, GetStrategyQuery } from "../application/queries/get-strategy.query";
import { ListStrategiesHandler, ListStrategiesQuery } from "../application/queries/list-strategies.query";
import { ListVersionsHandler, ListVersionsQuery } from "../application/queries/list-versions.query";
import { ListCategoriesHandler } from "../application/queries/list-categories.query";
import { ListTagsHandler } from "../application/queries/list-tags.query";
import { CreateStrategyDto } from "./dto/create-strategy.dto";
import { UpdateStrategyDto } from "./dto/update-strategy.dto";
import { CloneStrategyDto } from "./dto/clone-strategy.dto";
import { CreateVersionDto } from "./dto/create-version.dto";
import { ListStrategiesQueryDto } from "./dto/list-strategies-query.dto";
import { StrategyResponseDto, PaginatedStrategyListDto } from "./dto/strategy-response.dto";
import { VersionResponseDto } from "./dto/version-response.dto";
import { PublicationResponseDto } from "./dto/publication-response.dto";
import { toStrategyResponseDto, toPaginatedStrategyListDto } from "./mappers/strategy-response.mapper";
import { toVersionResponseDto, toPublicationResponseDto } from "./mappers/version-response.mapper";
import { toRuleGroupDomain } from "./mappers/rule-tree-request.mapper";
import { StrategyExceptionFilter } from "./filters/strategy-exception.filter";
import { VersionNotApprovedException } from "../application/errors/application.errors";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequireOrgRole } from "../../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../../organizations/guards/organization-role.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../auth/services/token.service";

const READ_ROLES = ["OWNER", "ADMINISTRATOR", "MANAGER", "ANALYST", "TRADER", "VIEWER"] as const;
const WRITE_ROLES = ["OWNER", "ADMINISTRATOR", "MANAGER", "ANALYST", "TRADER"] as const;

/**
 * Nested under `/organizations/:organizationId/strategies` — a real
 * architectural decision, not a literal copy of this milestone's own
 * flat route examples (`POST /strategies`). This module's own
 * "Security" section says to "integrate existing Organization
 * Context," and the platform's own established mechanism for that is
 * exactly this: `:organizationId` in the route, gated by
 * `OrganizationRoleGuard` + `@RequireOrgRole` alongside the platform-
 * wide `PermissionsGuard` (the same two-guard pattern every other
 * organization-scoped endpoint in this platform already uses since
 * Module 003's own `OrganizationRoleGuard`) — not a new mechanism
 * invented for this module.
 *
 * Controllers call ONLY application-layer handlers — never a
 * repository, never Prisma, directly (this milestone's own explicit
 * architecture rule, verified structurally the same way AI-102's own
 * Phase 4 controller was: a real test reads this file's own source and
 * confirms it imports nothing from `infrastructure/repositories/`
 * except the two DTO-mapping helper functions in `rest/mappers/`,
 * which touch domain objects only, never Prisma).
 */
@ApiTags("Strategy Engine")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@UseFilters(StrategyExceptionFilter)
@Controller("organizations/:organizationId/strategies")
export class StrategyController {
  constructor(
    private readonly createStrategy: CreateStrategyHandler,
    private readonly updateStrategy: UpdateStrategyHandler,
    private readonly archiveStrategy: ArchiveStrategyHandler,
    private readonly cloneStrategy: CloneStrategyHandler,
    private readonly createVersion: CreateVersionHandler,
    private readonly publishVersion: PublishVersionHandler,
    private readonly getStrategy: GetStrategyHandler,
    private readonly listStrategies: ListStrategiesHandler,
    private readonly listVersions: ListVersionsHandler,
    private readonly listCategories: ListCategoriesHandler,
    private readonly listTags: ListTagsHandler,
  ) {}

  @Get()
  @RequirePermissions("strategy-engine.read")
  @RequireOrgRole(...READ_ROLES)
  @ApiOperation({ operationId: "listStrategies", summary: "List/search strategies — status, category, tag, free-text search, pagination." })
  @ApiOkResponse({ type: PaginatedStrategyListDto })
  async list(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Query() query: ListStrategiesQueryDto): Promise<PaginatedStrategyListDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.listStrategies.execute(new ListStrategiesQuery(organizationId, page, pageSize, query.status, query.category, query.tag, query.searchText));
    return toPaginatedStrategyListDto(result, page, pageSize);
  }

  @Get("search")
  @RequirePermissions("strategy-engine.read")
  @RequireOrgRole(...READ_ROLES)
  @ApiOperation({ operationId: "searchStrategies", summary: "Same operation as GET /strategies — a dedicated path for clients that prefer an explicit /search endpoint. See ListStrategiesQuery's own comment for why this isn't a second implementation." })
  @ApiOkResponse({ type: PaginatedStrategyListDto })
  async search(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Query() query: ListStrategiesQueryDto): Promise<PaginatedStrategyListDto> {
    return this.list(organizationId, query);
  }

  @Get("categories")
  @RequirePermissions("strategy-engine.read")
  @RequireOrgRole(...READ_ROLES)
  @ApiOperation({ operationId: "listStrategyCategories", summary: "The closed, seeded set of strategy categories with display metadata." })
  async categories(@Param("organizationId", ParseUUIDPipe) _organizationId: string) {
    return this.listCategories.execute();
  }

  @Get("tags")
  @RequirePermissions("strategy-engine.read")
  @RequireOrgRole(...READ_ROLES)
  @ApiOperation({ operationId: "listStrategyTags", summary: "Every distinct tag ever used, platform-wide (tags are a shared dictionary — see the domain's own StrategyTag comment for why)." })
  async tags(@Param("organizationId", ParseUUIDPipe) _organizationId: string) {
    return this.listTags.execute();
  }

  @Get(":strategyId")
  @RequirePermissions("strategy-engine.read")
  @RequireOrgRole(...READ_ROLES)
  @ApiOperation({ operationId: "getStrategy", summary: "Get one strategy by id." })
  @ApiOkResponse({ type: StrategyResponseDto })
  async getOne(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("strategyId", ParseUUIDPipe) strategyId: string): Promise<StrategyResponseDto> {
    const strategy = await this.getStrategy.execute(new GetStrategyQuery(organizationId, strategyId));
    return toStrategyResponseDto(strategy);
  }

  @Post()
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({ operationId: "createStrategy", summary: "Create a new strategy." })
  @ApiOkResponse({ type: StrategyResponseDto })
  async create(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Body() body: CreateStrategyDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request): Promise<StrategyResponseDto> {
    const strategy = await this.createStrategy.execute(new CreateStrategyCommand(organizationId, body.name, body.description, body.category, user.sub, req.requestId));
    return toStrategyResponseDto(strategy);
  }

  @Put(":strategyId")
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({ operationId: "updateStrategy", summary: "Update a strategy's own name/description/tags. Covers 'AssignTags' — see UpdateStrategyCommand's own comment." })
  @ApiOkResponse({ type: StrategyResponseDto })
  async update(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("strategyId", ParseUUIDPipe) strategyId: string, @Body() body: UpdateStrategyDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request): Promise<StrategyResponseDto> {
    const strategy = await this.updateStrategy.execute(new UpdateStrategyCommand(organizationId, strategyId, user.sub, body.name, body.description, body.addTags, body.removeTags, req.requestId));
    return toStrategyResponseDto(strategy);
  }

  @Delete(":strategyId")
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({ operationId: "deleteStrategy", summary: "Archives the strategy — the domain has no hard delete. See ArchiveStrategyCommand's own comment." })
  @ApiOkResponse({ type: StrategyResponseDto })
  async remove(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("strategyId", ParseUUIDPipe) strategyId: string, @CurrentUser() user: AccessTokenPayload, @Req() req: Request): Promise<StrategyResponseDto> {
    const strategy = await this.archiveStrategy.execute(new ArchiveStrategyCommand(organizationId, strategyId, user.sub, req.requestId));
    return toStrategyResponseDto(strategy);
  }

  @Post(":strategyId/clone")
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({ operationId: "cloneStrategy", summary: "Clone a strategy's own metadata and latest version into a new strategy." })
  @ApiOkResponse({ type: StrategyResponseDto })
  async clone(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("strategyId", ParseUUIDPipe) strategyId: string, @Body() body: CloneStrategyDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request): Promise<StrategyResponseDto> {
    const strategy = await this.cloneStrategy.execute(new CloneStrategyCommand(organizationId, strategyId, body.newName, user.sub, req.requestId));
    return toStrategyResponseDto(strategy);
  }

  @Post(":strategyId/publish")
  @RequirePermissions("strategy-engine.approve")
  @RequireOrgRole("OWNER", "ADMINISTRATOR", "MANAGER")
  @ApiOperation({
    operationId: "publishStrategyLatestApprovedVersion",
    summary: "Publish this strategy's own latest APPROVED version.",
    description: "Resolves 'latest approved version' by scanning this strategy's own versions for the most recent one with status APPROVED, then calls the exact same PublishVersionHandler that POST /strategy-versions/:versionId/publish uses directly — one real operation, two entry points, per this milestone's own route list naming both.",
  })
  @ApiOkResponse({ type: PublicationResponseDto })
  async publishLatestApproved(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("strategyId", ParseUUIDPipe) strategyId: string, @CurrentUser() user: AccessTokenPayload, @Req() req: Request): Promise<PublicationResponseDto> {
    const versions = await this.listVersions.execute(new ListVersionsQuery(organizationId, strategyId));
    const latestApproved = versions.find((v) => v.status === "APPROVED");
    if (!latestApproved) {
      throw new VersionNotApprovedException(`Strategy "${strategyId}" has no version currently in APPROVED status to publish.`, { strategyId });
    }
    const publication = await this.publishVersion.execute(new PublishVersionCommand(organizationId, latestApproved.id, user.sub, req.requestId));
    return toPublicationResponseDto(publication);
  }

  @Get(":strategyId/versions")
  @RequirePermissions("strategy-engine.read")
  @RequireOrgRole(...READ_ROLES)
  @ApiOperation({ operationId: "listStrategyVersions", summary: "List every version of one strategy, newest first." })
  @ApiOkResponse({ type: [VersionResponseDto] })
  async versions(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("strategyId", ParseUUIDPipe) strategyId: string): Promise<VersionResponseDto[]> {
    const versions = await this.listVersions.execute(new ListVersionsQuery(organizationId, strategyId));
    return versions.map(toVersionResponseDto);
  }

  @Post(":strategyId/versions")
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({ operationId: "createStrategyVersion", summary: "Create a new DRAFT version with its own entry/exit rule trees and parameters." })
  @ApiOkResponse({ type: VersionResponseDto })
  async createNewVersion(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("strategyId", ParseUUIDPipe) strategyId: string, @Body() body: CreateVersionDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request): Promise<VersionResponseDto> {
    const entryRules = toRuleGroupDomain(body.entryRules);
    const exitRules = toRuleGroupDomain(body.exitRules);
    const version = await this.createVersion.execute(new CreateVersionCommand(organizationId, strategyId, entryRules, exitRules, body.parameters as never, user.sub, req.requestId));
    return toVersionResponseDto(version);
  }
}
