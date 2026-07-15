import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsISO8601, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

/** Item 3's own validated fields: parameters, indicator ids, versions, calculation mode, timeframe, request format. Mirrors Phase 3's plain `ExecuteIndicatorRequest` field-for-field — this is that same shape with class-validator decorations, the identical relationship AI-101's own Phase 4 DTOs had to their Phase 1-3 plain request models. */
export class ExecuteIndicatorDto {
  @ApiProperty({ example: "ema" })
  @IsString()
  indicatorIdentifier!: string;

  @ApiPropertyOptional({ description: "Omitted = latest registered version." })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  instrumentId!: string;

  @ApiProperty({ description: "One of AI-101's CandleInterval values.", example: "ONE_DAY" })
  @IsString()
  timeframe!: string;

  @ApiPropertyOptional({ example: { period: 20 } })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, number | string | boolean>;

  @ApiProperty({ enum: ["FULL_RECALCULATION", "INCREMENTAL", "HISTORICAL_REPLAY", "LIVE_TICK", "LIVE_BAR", "BACKTEST"] })
  @IsString()
  calculationMode!: "FULL_RECALCULATION" | "INCREMENTAL" | "HISTORICAL_REPLAY" | "LIVE_TICK" | "LIVE_BAR" | "BACKTEST";

  @ApiProperty({ description: "ISO 8601, UTC" })
  @IsISO8601()
  from!: string;

  @ApiProperty({ description: "ISO 8601, UTC" })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  timeoutMs?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  cancellable?: boolean;
}
