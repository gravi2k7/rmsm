import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { GapDetectionService } from "../services/gap-detection.service";
import { GapRepairService } from "../services/gap-repair.service";
import { DataGapRepository } from "../repositories/data-gap.repository";
import { DetectGapsDto } from "../dto/detect-gaps.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../auth/services/token.service";
import type { DataGapModel } from "../interfaces/models/operational.models";

const DATA_GAP_STATUS_VALUES = ["DETECTED", "BACKFILLING", "RESOLVED", "UNRESOLVED", "IGNORED"] as const;

class DataGapStatusQueryDto {
  @ApiPropertyOptional({ enum: DATA_GAP_STATUS_VALUES })
  @IsOptional()
  @IsEnum(DATA_GAP_STATUS_VALUES)
  status?: (typeof DATA_GAP_STATUS_VALUES)[number];
}

/** FIP-001 Domain 7 (Gap Detection + automatic repair via alternate providers). */
@ApiTags("Market Data — Gaps")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/gaps")
export class GapController {
  constructor(
    private readonly detectionService: GapDetectionService,
    private readonly repairService: GapRepairService,
    private readonly gapRepository: DataGapRepository,
  ) {}

  @Get()
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "listGaps", summary: "List data gaps, optionally filtered by status (defaults to DETECTED)." })
  list(@Query() query: DataGapStatusQueryDto): Promise<DataGapModel[]> {
    return this.gapRepository.findByStatus(query.status ?? "DETECTED", 100);
  }

  @Post("detect")
  @RequirePermissions("market-data.gap.manage")
  @ApiOperation({ operationId: "detectGaps", summary: "Scan one instrument/interval over a date range for missing candles and record new DataGap rows." })
  @ApiOkResponse({ description: "Newly detected gaps this scan (already-recorded overlapping gaps are not duplicated)." })
  detect(@Body() dto: DetectGapsDto): Promise<DataGapModel[]> {
    return this.detectionService.detectGaps(dto.instrumentId, dto.interval, new Date(dto.from), new Date(dto.to), {
      respectWeekends: dto.respectWeekends,
    });
  }

  @Post(":id/repair")
  @RequirePermissions("market-data.gap.manage")
  @ApiOperation({ operationId: "repairGap", summary: "Attempt automatic repair of one gap via alternate providers (priority-ordered failover)." })
  repair(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<DataGapModel> {
    return this.repairService.repairGap(id, user.sub);
  }
}
