import { Controller, Get, Post, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { MarketDataAdminService } from "../services/market-data-admin.service";
import { ProviderConfigResponseDto } from "../dto/responses/provider-config-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { ProviderDiagnosticsService } from "../services/provider-diagnostics.service";


/** Read-only, no credential exposure — ProviderConfigResponseDto has no credentialReference field at all (not just omitted at serialization time; the DTO's shape structurally cannot carry it). */
@ApiTags("Market Data — Providers")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/providers")
export class ProviderConfigController {
  constructor(
  private readonly adminService: MarketDataAdminService,
  private readonly providerDiagnosticsService: ProviderDiagnosticsService,
) {}

  @Get()
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "listProviderConfigs",
    summary: "List platform provider configurations (credentials never included).",
  })
  @ApiOkResponse({ type: [ProviderConfigResponseDto] })
  list(): Promise<ProviderConfigResponseDto[]> {
    return this.adminService.listProviderConfigs();
  }

  @Post(":id/test-connection")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "testProviderConnection",
    summary: "Test provider connection.",
  })
  async testConnection(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.adminService.testProviderConnection(id);
  }
@Get("diagnostics")
@RequirePermissions("market-data.admin.manage")
@ApiOperation({
  operationId: "getProviderDiagnostics",
  summary: "Get provider diagnostics.",
})
async diagnostics() {
  return this.providerDiagnosticsService.getAllDiagnostics();
}
  @Get(":id")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "getProviderConfig",
    summary: "Get one provider configuration by id (credentials never included).",
  })
  @ApiOkResponse({ type: ProviderConfigResponseDto })
  get(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ProviderConfigResponseDto> {
    return this.adminService.getProviderConfig(id);
  }
}
