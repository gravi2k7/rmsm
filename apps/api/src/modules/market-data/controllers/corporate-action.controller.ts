import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { MarketDataService } from "../services/market-data.service";
import { CorporateActionQueryDto } from "../dto/corporate-action-query.dto";
import { CorporateActionResponseDto } from "../dto/responses/corporate-action-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

/** "Filter" and "Search" (named in Phase 4's own spec) beyond a single instrumentId are NOT implemented — CorporateActionRepository (Phase 2A) only has findByInstrument(), and Phase 4 forbids repository changes. Same honest treatment as every other capability gap this phase (see CorporateActionQueryDto's own comment). */
@ApiTags("Market Data — Corporate Actions")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/corporate-actions")
export class CorporateActionController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  @RequirePermissions("market-data.read")
  @ApiOperation({ operationId: "listCorporateActions", summary: "Corporate actions for one instrument." })
  @ApiOkResponse({ type: [CorporateActionResponseDto] })
  list(@Query() query: CorporateActionQueryDto): Promise<CorporateActionResponseDto[]> {
    return this.marketDataService.getCorporateActions(query.instrumentId);
  }
}
