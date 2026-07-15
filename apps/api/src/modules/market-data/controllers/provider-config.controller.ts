import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { MarketDataAdminService } from "../services/market-data-admin.service";
import { ProviderConfigResponseDto } from "../dto/responses/provider-config-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

/** Read-only, no credential exposure — ProviderConfigResponseDto has no credentialReference field at all (not just omitted at serialization time; the DTO's shape structurally cannot carry it). */
@ApiTags("Market Data — Providers")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/providers")
export class ProviderConfigController {
  constructor(private readonly adminService: MarketDataAdminService) {}

  @Get()
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "listProviderConfigs", summary: "List platform provider configurations (credentials never included)." })
  @ApiOkResponse({ type: [ProviderConfigResponseDto] })
  list(): Promise<ProviderConfigResponseDto[]> {
    return this.adminService.listProviderConfigs();
  }

  @Get(":id")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getProviderConfig", summary: "Get one provider configuration by id (credentials never included)." })
  @ApiOkResponse({ type: ProviderConfigResponseDto })
  get(@Param("id", ParseUUIDPipe) id: string): Promise<ProviderConfigResponseDto> {
    return this.adminService.getProviderConfig(id);
  }
}
