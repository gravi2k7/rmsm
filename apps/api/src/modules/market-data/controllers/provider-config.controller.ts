import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { MarketDataAdminService } from "../services/market-data-admin.service";
import { ProviderConfigResponseDto } from "../dto/responses/provider-config-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { ProviderConnectionTestService } from "../services/provider-connection-test.service";

@ApiTags("Market Data — Providers")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/providers")
export class ProviderConfigController {
  constructor(
    private readonly adminService: MarketDataAdminService,
    private readonly providerConnectionTestService: ProviderConnectionTestService,
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
  async testConnection(@Param("id", ParseUUIDPipe) id: string) {
    return this.providerConnectionTestService.testConnection(id);
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
