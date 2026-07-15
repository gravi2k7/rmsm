import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AssetClass, InstrumentStatus } from "@rmsm/database";

export class InstrumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() exchangeId!: string;
  @ApiProperty() symbol!: string;
  @ApiProperty() name!: string;
  @ApiProperty() assetClass!: AssetClass;
  @ApiProperty() status!: InstrumentStatus;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() isin?: string | null;
  @ApiPropertyOptional() cusip?: string | null;
  @ApiPropertyOptional({ description: "Decimal string, never a float — see AI-101's Phase 1 data model doc." }) tickSize?: string | null;
  @ApiPropertyOptional() lotSize?: string | null;
  @ApiPropertyOptional() listedAt?: Date | null;
  @ApiPropertyOptional() delistedAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
