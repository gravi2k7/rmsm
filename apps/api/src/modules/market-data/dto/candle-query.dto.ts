import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

const CANDLE_INTERVAL_VALUES = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
] as const;

/**
 * Two ways to identify the instrument, per Phase 4's explicit "Symbol,
 * Exchange" filter requirement — either `instrumentId` directly, or
 * `exchangeId` + `symbol` (resolved via
 * `MarketDataService.getInstrumentByExchangeAndSymbol`, built in Phase
 * 3). `ValidateIf` enforces that at least the id form OR the symbol form
 * is fully present — class-validator has no native "exactly one of
 * these two groups" constraint, so this is the closest honest
 * approximation: both fields in a group must be present together if
 * that group is chosen, checked here; "did the caller provide at least
 * one complete group" is the controller's job (a clear 400 if neither
 * resolves, not a silent fallback).
 */
export class CandleQueryDto {
  @ApiPropertyOptional({ description: "Provide this OR (exchangeId + symbol)." })
  @IsOptional()
  @IsUUID()
  instrumentId?: string;

  @ApiPropertyOptional({ description: "Used with `symbol` when `instrumentId` isn't known." })
  @ValidateIf((dto: CandleQueryDto) => !dto.instrumentId)
  @IsUUID()
  exchangeId?: string;

  @ApiPropertyOptional({ description: "Used with `exchangeId` when `instrumentId` isn't known." })
  @ValidateIf((dto: CandleQueryDto) => !dto.instrumentId)
  @IsString()
  symbol?: string;

  @ApiProperty({ enum: CANDLE_INTERVAL_VALUES })
  @IsEnum(CANDLE_INTERVAL_VALUES)
  interval!: (typeof CANDLE_INTERVAL_VALUES)[number];

  @ApiProperty({ description: "ISO 8601, UTC" })
  @IsISO8601()
  from!: string;

  @ApiProperty({ description: "ISO 8601, UTC" })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional({ default: 500, maximum: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number = 500;
}
