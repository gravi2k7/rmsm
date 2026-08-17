import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { MarketDataService } from "../services/market-data.service";
import { InstrumentDiscoveryService } from "../services/instrument-discovery.service";
import { InstrumentOnboardingService } from "../services/instrument-onboarding.service";
import { InstrumentOnboardingDto } from "../dto/instrument-onboarding.dto";
import { InstrumentProviderSearchDto } from "../dto/instrument-provider-search.dto";
import { InstrumentProviderSearchResultDto } from "../dto/responses/instrument-provider-search-result.dto";
import { InstrumentResponseDto } from "../dto/responses/instrument-response.dto";
import { PaginationMetaDto } from "../dto/responses/pagination-meta.dto";
import { InstrumentSearchDto } from "../dto/instrument-search.dto";
import {
  toPageParams,
  buildPaginatedResult,
  PaginatedResult,
} from "../utils/pagination.util";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

class InstrumentListResponseDto {
  data!: InstrumentResponseDto[];
  pagination!: PaginationMetaDto;
}

@ApiTags("Market Data — Instruments")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/instruments")
export class InstrumentController {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly instrumentDiscoveryService: InstrumentDiscoveryService,
    private readonly instrumentOnboardingService: InstrumentOnboardingService,
  ) {}

  @Get()
  @RequirePermissions("market-data.read")
  @ApiOperation({
    operationId: "listInstruments",
    summary:
      "List/search/filter instruments — query, assetClass, status, page, pageSize.",
    description:
      "NOTE: exchangeId filtering is NOT currently applied here, even though InstrumentSearchDto accepts the field. InstrumentRepository.search() (Phase 2A) has no exchangeId filter, and Phase 4 explicitly forbids repository changes. Filtering results in-memory after a paginated DB query would silently corrupt the pagination contract (a page could return fewer than pageSize rows, or an inflated totalCount) — worse than not filtering at all. Flagged as a real, deferred gap requiring a Phase 2A repository change, not silently worked around. Use GET /market-data/exchanges/:id then browse that exchange's instruments once this filter exists.",
  })
  @ApiOkResponse({ type: InstrumentListResponseDto })
  async list(
    @Query() search: InstrumentSearchDto,
  ): Promise<PaginatedResult<InstrumentResponseDto>> {
    const { take, skip, page, pageSize } = toPageParams(search);

    // exchangeId deliberately excluded from filters — see this method's
    // @ApiOperation description for why.
    const filters = {
      assetClass: search.assetClass,
      status: search.status,
      search: search.query,
    };

    const [data, totalCount] = await Promise.all([
      this.marketDataService.searchInstruments(filters, { take, skip }),
      this.marketDataService.countInstruments({
        assetClass: search.assetClass,
        status: search.status,
      }),
    ]);

    return buildPaginatedResult(data, totalCount, page, pageSize);
  }

  @Get("search")
  @RequirePermissions("market-data.read")
  @ApiOperation({
    operationId: "searchProviderInstrumentSymbols",
    summary: "Search an external provider for instrument symbols.",
    description:
      "Read-only provider discovery. Search results are not persisted to the RMSM instrument universe.",
  })
  @ApiOkResponse({ type: [InstrumentProviderSearchResultDto] })
  searchProviderSymbols(
    @Query() query: InstrumentProviderSearchDto,
  ): Promise<InstrumentProviderSearchResultDto[]> {
    return this.instrumentDiscoveryService.searchProviderSymbols(
      query.providerConfigId,
      query.query,
      query.limit,
    );
  }

  @Post()
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "onboardInstrument",
    summary: "Add one provider-discovered instrument to the RMSM universe.",
    description:
      "Explicit instrument onboarding. Creates or updates the canonical instrument and its provider alias. This does not synchronize the provider instrument universe.",
  })
  @ApiOkResponse({ type: InstrumentResponseDto })
  onboard(
    @Body() request: InstrumentOnboardingDto,
  ): Promise<InstrumentResponseDto> {
    return this.instrumentOnboardingService.onboard(request);
  }

  @Get(":id")
  @RequirePermissions("market-data.read")
  @ApiOperation({
    operationId: "getInstrument",
    summary: "Get one instrument by id.",
  })
  @ApiOkResponse({ type: InstrumentResponseDto })
  get(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<InstrumentResponseDto> {
    return this.marketDataService.getInstrument(id);
  }
}
