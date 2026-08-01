import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsISO8601, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
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

/** FIP-001 Domain 3 — request body for scheduling a batched/resumable/retryable import (as opposed to `HistoricalImportService.importHistoricalCandles()`'s original synchronous one-shot call, still reachable via the existing candle controller's own trigger path). */
export class ScheduleImportDto {
  @ApiProperty() @IsUUID() instrumentId!: string;
  @ApiProperty() @IsUUID() providerConfigId!: string;
  @ApiProperty({ enum: CANDLE_INTERVAL_VALUES }) @IsEnum(CANDLE_INTERVAL_VALUES) interval!: (typeof CANDLE_INTERVAL_VALUES)[number];
  @ApiProperty() @IsISO8601() from!: string;
  @ApiProperty() @IsISO8601() to!: string;
  @ApiPropertyOptional({ description: "One-click import when true (import today's data only) vs. an explicit date-range import." })
  @IsOptional()
  @IsBoolean()
  isIncremental?: boolean;
  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;
  @ApiPropertyOptional({ description: "Defer execution until this time — omit to run as soon as the scheduler next polls." })
  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;
}
