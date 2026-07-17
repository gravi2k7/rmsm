import { ApiProperty } from "@nestjs/swagger";

export class StrategyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ enum: ["ACTIVE", "ARCHIVED"] }) status!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ nullable: true }) currentPublishedVersionId!: string | null;
  @ApiProperty() createdByUserId!: string;
  @ApiProperty() createdAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalCount!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class PaginatedStrategyListDto {
  @ApiProperty({ type: [StrategyResponseDto] }) data!: StrategyResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) pagination!: PaginationMetaDto;
}
