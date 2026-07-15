import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { MarketDataService } from "../services/market-data.service";
import { ExchangeResponseDto } from "../dto/responses/exchange-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

class ExchangeSearchQueryDto {
  @ApiPropertyOptional({ description: "Matches against exchange code or name, case-insensitively." })
  @IsOptional()
  @IsString()
  q?: string;
}

/**
 * `GET /market-data/exchanges` — no `OrganizationRoleGuard` anywhere in
 * this module's controllers (ADR-021: AI-101 has no `organizationId`
 * anywhere). Gated by `PermissionsGuard` alone, the same platform-level
 * pattern EP-005's `AdminNotificationController` used for its own
 * platform-wide (non-org-scoped) resources.
 */
@ApiTags("Market Data — Exchanges")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/exchanges")
export class ExchangeController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  @RequirePermissions("market-data.read")
  @ApiOperation({ operationId: "listExchanges", summary: "List every active exchange." })
  @ApiOkResponse({ type: [ExchangeResponseDto] })
  list(): Promise<ExchangeResponseDto[]> {
    return this.marketDataService.listExchanges();
  }

  @Get("search")
  @RequirePermissions("market-data.read")
  @ApiOperation({ operationId: "searchExchanges", summary: "Search exchanges by code or name." })
  @ApiOkResponse({ type: [ExchangeResponseDto] })
  search(@Query() query: ExchangeSearchQueryDto): Promise<ExchangeResponseDto[]> {
    return this.marketDataService.searchExchanges(query.q ?? "");
  }

  @Get(":id")
  @RequirePermissions("market-data.read")
  @ApiOperation({ operationId: "getExchange", summary: "Get one exchange by id." })
  @ApiOkResponse({ type: ExchangeResponseDto })
  get(@Param("id", ParseUUIDPipe) id: string): Promise<ExchangeResponseDto> {
    return this.marketDataService.getExchange(id);
  }
}
