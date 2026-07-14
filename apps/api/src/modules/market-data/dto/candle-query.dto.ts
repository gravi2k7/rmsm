import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
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

/** Shape for a future GET .../candles endpoint (Phase 3+ — no controller exists yet this phase). Prepared now, matching this project's established precedent (EP-005 Phase 1 built DTOs before any controller used them) of DTOs being a "contract," not an implementation detail scoped to controllers alone. */
export class CandleQueryDto {
  @ApiProperty()
  @IsUUID()
  instrumentId!: string;

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
