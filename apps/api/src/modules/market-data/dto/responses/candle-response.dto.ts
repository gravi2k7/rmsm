import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CandleInterval, MarketDataSource } from "@rmsm/database";

export class CandleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() instrumentId!: string;
  @ApiProperty() interval!: CandleInterval;
  @ApiProperty() eventTime!: Date;
  @ApiProperty({ description: "Decimal string, never a float." }) open!: string;
  @ApiProperty() high!: string;
  @ApiProperty() low!: string;
  @ApiProperty() close!: string;
  @ApiProperty() volume!: string;
  @ApiProperty() providerId!: string;
  @ApiProperty() source!: MarketDataSource;
  @ApiProperty() isCorrection!: boolean;
  @ApiPropertyOptional({ description: "Set when this row is a correction — the id of the row it replaces (ADR-022)." }) supersedesId?: string | null;
}
