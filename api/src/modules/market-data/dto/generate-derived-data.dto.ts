import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsUUID } from "class-validator";

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

/** Shared by DerivedDataController (Domain 10) and AiReadinessController (Domain 12) — both trigger a "compute for this instrument/interval, right now" pass over the same latest-window candle data. */
export class GenerateForInstrumentDto {
  @ApiProperty() @IsUUID() instrumentId!: string;
  @ApiProperty({ enum: CANDLE_INTERVAL_VALUES }) @IsEnum(CANDLE_INTERVAL_VALUES) interval!: (typeof CANDLE_INTERVAL_VALUES)[number];
}
