import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { MarketDataProviderType } from "@rmsm/database";
import { MarketDataAdminService } from "../services/market-data-admin.service";
import { ProviderCredentialService } from "../services/provider-credential.service";
import { ProviderDiagnosticsService } from "../services/provider-diagnostics.service";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderConfigResponseDto } from "../dto/responses/provider-config-response.dto";
import { ProviderDiagnosticsResponseDto, ConnectionTestResultResponseDto } from "../dto/responses/provider-diagnostics-response.dto";
import { UpdateProviderPriorityDto } from "../dto/update-provider-priority.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../auth/services/token.service";

/** Read-only, no credential exposure — ProviderConfigResponseDto has no credentialReference field at all (not just omitted at serialization time; the DTO's shape structurally cannot carry it). FIP-001 adds mutating provider-management endpoints (priority, connection test) gated by the more specific market-data.provider.manage permission, distinct from the read-only market-data.admin.manage every GET here still uses. */
@ApiTags("Market Data — Providers")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/providers")
export class ProviderConfigController {
  constructor(
    private readonly adminService: MarketDataAdminService,
    private readonly credentialService: ProviderCredentialService,
    private readonly diagnosticsService: ProviderDiagnosticsService,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
  ) {}

  @Get()
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "listProviderConfigs", summary: "List platform provider configurations (credentials never included)." })
  @ApiOkResponse({ type: [ProviderConfigResponseDto] })
  list(): Promise<ProviderConfigResponseDto[]> {
    return this.adminService.listProviderConfigs();
  }

  @Get("diagnostics")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getProviderDiagnostics", summary: "Combined provider diagnostics: registry state, circuit-breaker state, credential presence, priority." })
  @ApiOkResponse({ type: [ProviderDiagnosticsResponseDto] })
  getDiagnostics(): Promise<ProviderDiagnosticsResponseDto[]> {
    return this.diagnosticsService.getAllDiagnostics();
  }

  @Get(":id")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getProviderConfig", summary: "Get one provider configuration by id (credentials never included)." })
  @ApiOkResponse({ type: ProviderConfigResponseDto })
  get(@Param("id", ParseUUIDPipe) id: string): Promise<ProviderConfigResponseDto> {
    return this.adminService.getProviderConfig(id);
  }

  @Patch(":id/priority")
  @RequirePermissions("market-data.provider.manage")
  @ApiOperation({ operationId: "updateProviderPriority", summary: "Set a provider's resolution/failover priority (lower runs first)." })
  @ApiOkResponse({ type: ProviderConfigResponseDto })
  async updatePriority(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderPriorityDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ProviderConfigResponseDto> {
    return this.providerConfigRepository.updatePriority(id, dto.priority, user.sub);
  }

  @Post(":id/test-connection")
  @RequirePermissions("market-data.provider.manage")
  @ApiOperation({ operationId: "testProviderConnection", summary: "Run a real, on-demand connection/health test against a provider." })
  @ApiOkResponse({ type: ConnectionTestResultResponseDto })
  async testConnection(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ConnectionTestResultResponseDto> {
    return this.credentialService.testConnection(id, user.sub);
  }

  @Get("credentials/:type/status")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getProviderCredentialStatus", summary: "Whether a provider type's required credential is configured (never returns the credential itself)." })
  getCredentialStatus(@Param("type") type: MarketDataProviderType): ReturnType<ProviderCredentialService["getCredentialStatus"]> {
    return this.credentialService.getCredentialStatus(type);
  }
}
