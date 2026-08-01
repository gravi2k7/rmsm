import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsUUID } from "class-validator";

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

export class DetectGapsDto {
  @ApiProperty() @IsUUID() instrumentId!: string;
  @ApiProperty({ enum: CANDLE_INTERVAL_VALUES }) @IsEnum(CANDLE_INTERVAL_VALUES) interval!: (typeof CANDLE_INTERVAL_VALUES)[number];
  @ApiProperty() @IsISO8601() from!: string;
  @ApiProperty() @IsISO8601() to!: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() respectWeekends?: boolean;
}
