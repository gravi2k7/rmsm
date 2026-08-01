import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CandleQualityMetadataRepository } from "../repositories/candle-quality-metadata.repository";
import { DataQualityIssueRepository } from "../repositories/data-quality-issue.repository";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

/** FIP-001 Domain 6 (Quality Pipeline) reporting surface — per-candle scoring itself happens inline during import (QualityScoringService, invoked from HistoricalImportService); this controller is the read-side summary. */
@ApiTags("Market Data — Quality")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/quality")
export class QualityController {
  constructor(
    private readonly qualityMetadataRepository: CandleQualityMetadataRepository,
    private readonly qualityIssueRepository: DataQualityIssueRepository,
  ) {}

  @Get("summary")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getQualitySummary", summary: "Average quality/confidence scores plus quality-issue counts by status." })
  async summary() {
    const [averageScores, issuesByStatus] = await Promise.all([
      this.qualityMetadataRepository.getAverageScores(),
      this.qualityIssueRepository.countByStatus(),
    ]);
    return { averageScores, issuesByStatus };
  }
}
