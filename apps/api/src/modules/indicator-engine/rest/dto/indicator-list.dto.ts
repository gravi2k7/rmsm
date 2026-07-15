import { ApiProperty } from "@nestjs/swagger";
import { IndicatorMetadataDto } from "./indicator-metadata.dto";

/** The recommended "consistent pagination model for list endpoints" — the SAME shape (PaginationMetaDto-equivalent) AI-101's own Phase 4 established, reused in spirit (not the exact class, since that lives in the market-data module — this is AI-102's own copy of the identical shape, matching field-for-field so a future cross-module client sees one consistent pagination contract everywhere in this platform). */
export class PaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalCount!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class IndicatorListDto {
  @ApiProperty({ type: [IndicatorMetadataDto] }) data!: IndicatorMetadataDto[];
  @ApiProperty({ type: PaginationMetaDto }) pagination!: PaginationMetaDto;
}
