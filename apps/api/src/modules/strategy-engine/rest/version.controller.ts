import { Controller, Get, Post, Body, Param, UseGuards, UseFilters, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ValidateVersionHandler, ValidateVersionCommand } from "../application/commands/validate-version.command";
import { RequestApprovalHandler, RequestApprovalCommand } from "../application/commands/request-approval.command";
import { DecideApprovalHandler, DecideApprovalCommand } from "../application/commands/decide-approval.command";
import { PublishVersionHandler, PublishVersionCommand } from "../application/commands/publish-version.command";
import { RollbackVersionHandler, RollbackVersionCommand } from "../application/commands/rollback-version.command";
import { GetVersionHandler, GetVersionQuery } from "../application/queries/get-version.query";
import { DecideApprovalDto } from "./dto/decide-approval.dto";
import { VersionResponseDto } from "./dto/version-response.dto";
import { ValidationResponseDto } from "./dto/validation-response.dto";
import { ApprovalResponseDto } from "./dto/approval-response.dto";
import { PublicationResponseDto } from "./dto/publication-response.dto";
import { toVersionResponseDto, toValidationResponseDto, toApprovalResponseDto, toPublicationResponseDto } from "./mappers/version-response.mapper";
import { StrategyExceptionFilter } from "./filters/strategy-exception.filter";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequireOrgRole } from "../../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../../organizations/guards/organization-role.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../auth/services/token.service";

const READ_ROLES = ["OWNER", "ADMINISTRATOR", "MANAGER", "ANALYST", "TRADER", "VIEWER"] as const;
const WRITE_ROLES = ["OWNER", "ADMINISTRATOR", "MANAGER", "ANALYST", "TRADER"] as const;
const APPROVE_ROLES = ["OWNER", "ADMINISTRATOR", "MANAGER"] as const;

/**
 * Version-specific operations that don't naturally read as
 * "under one strategy" (validate/approve/publish/rollback all operate
 * on a version by its OWN id) — a separate controller from
 * `StrategyController`, matching this milestone's own route list
 * (`GET /versions/:id`, `POST /versions/:id/publish`,
 * `POST /versions/:id/rollback`, as genuinely distinct paths from the
 * `/strategies/...` ones). Same org-scoping convention, same
 * controllers-call-only-handlers rule.
 */
@ApiTags("Strategy Engine — Versions")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@UseFilters(StrategyExceptionFilter)
@Controller("organizations/:organizationId/strategy-versions")
export class StrategyVersionController {
  constructor(
    private readonly getVersion: GetVersionHandler,
    private readonly validateVersion: ValidateVersionHandler,
    private readonly requestApproval: RequestApprovalHandler,
    private readonly decideApproval: DecideApprovalHandler,
    private readonly publishVersion: PublishVersionHandler,
    private readonly rollbackVersion: RollbackVersionHandler,
  ) {}

  @Get(":versionId")
  @RequirePermissions("strategy-engine.read")
  @RequireOrgRole(...READ_ROLES)
  @ApiOperation({ operationId: "getStrategyVersion", summary: "Get one strategy version by id, including its own full rule tree." })
  @ApiOkResponse({ type: VersionResponseDto })
  async getOne(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("versionId", ParseUUIDPipe) versionId: string): Promise<VersionResponseDto> {
    const version = await this.getVersion.execute(new GetVersionQuery(organizationId, versionId));
    return toVersionResponseDto(version);
  }

  @Post(":versionId/validate")
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({
    operationId: "validateStrategyVersion",
    summary: "Run structural validation against this version's own rule tree and parameters.",
    description: "Real, structural-only validation. Indicator-reference cross-checks against AI-102's own registry are not yet implemented — see StructuralValidationService's own header comment. Every validation response includes an explicit AI102_CROSS_CHECK_DEFERRED warning finding naming this gap.",
  })
  @ApiOkResponse({ type: ValidationResponseDto })
  async validate(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("versionId", ParseUUIDPipe) versionId: string, @CurrentUser() user: AccessTokenPayload): Promise<ValidationResponseDto> {
    const validation = await this.validateVersion.execute(new ValidateVersionCommand(organizationId, versionId, user.sub));
    return toValidationResponseDto(validation);
  }

  @Post(":versionId/request-approval")
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({ operationId: "requestVersionApproval", summary: "Move this version into PENDING_APPROVAL and open a real approval request." })
  @ApiOkResponse({ type: ApprovalResponseDto })
  async requestApprovalFor(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("versionId", ParseUUIDPipe) versionId: string, @CurrentUser() user: AccessTokenPayload): Promise<ApprovalResponseDto> {
    const approval = await this.requestApproval.execute(new RequestApprovalCommand(organizationId, versionId, user.sub));
    return toApprovalResponseDto(approval);
  }

  @Post(":versionId/decide")
  @RequirePermissions("strategy-engine.approve")
  @RequireOrgRole(...APPROVE_ROLES)
  @ApiOperation({ operationId: "decideVersionApproval", summary: "Approve or reject this version's own pending approval request. Covers both 'ApproveStrategy' and 'RejectStrategy' — see DecideApprovalCommand's own comment." })
  @ApiOkResponse({ type: ApprovalResponseDto })
  async decide(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("versionId", ParseUUIDPipe) versionId: string, @Body() body: DecideApprovalDto, @CurrentUser() user: AccessTokenPayload): Promise<ApprovalResponseDto> {
    const approval = await this.decideApproval.execute(new DecideApprovalCommand(organizationId, versionId, body.decision, user.sub, body.comments));
    return toApprovalResponseDto(approval);
  }

  @Post(":versionId/publish")
  @RequirePermissions("strategy-engine.approve")
  @RequireOrgRole(...APPROVE_ROLES)
  @ApiOperation({ operationId: "publishStrategyVersion", summary: "Publish this specific version directly (must be APPROVED)." })
  @ApiOkResponse({ type: PublicationResponseDto })
  async publish(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("versionId", ParseUUIDPipe) versionId: string, @CurrentUser() user: AccessTokenPayload): Promise<PublicationResponseDto> {
    const publication = await this.publishVersion.execute(new PublishVersionCommand(organizationId, versionId, user.sub));
    return toPublicationResponseDto(publication);
  }

  @Post(":versionId/rollback")
  @RequirePermissions("strategy-engine.write")
  @RequireOrgRole(...WRITE_ROLES)
  @ApiOperation({
    operationId: "rollbackStrategyVersion",
    summary: "Create a new DRAFT version copying this (older) version's own rule tree and parameters.",
    description: "Does not resurrect the target version's own row — a published/superseded version is permanently immutable. See RollbackVersionCommand's own comment for the full reasoning.",
  })
  @ApiOkResponse({ type: VersionResponseDto })
  async rollback(@Param("organizationId", ParseUUIDPipe) organizationId: string, @Param("versionId", ParseUUIDPipe) versionId: string, @CurrentUser() user: AccessTokenPayload): Promise<VersionResponseDto> {
    const target = await this.getVersion.execute(new GetVersionQuery(organizationId, versionId));
    const rolledBack = await this.rollbackVersion.execute(new RollbackVersionCommand(organizationId, target.strategyId, versionId, user.sub));
    return toVersionResponseDto(rolledBack);
  }
}
