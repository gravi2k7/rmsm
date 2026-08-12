import { ApiProperty } from "@nestjs/swagger";
import { CandleInterval } from "@rmsm/database";
import { IsDateString, IsEnum, IsUUID } from "class-validator";

export class ImportHistoricalCandlesDto {
  @ApiProperty()
  @IsUUID()
  instrumentId!: string;

  @ApiProperty()
  @IsUUID()
  providerConfigId!: string;

  @ApiProperty({ enum: CandleInterval })
  @IsEnum(CandleInterval)
  interval!: CandleInterval;

  @ApiProperty({
    description: "Inclusive historical range start.",
    example: "2026-08-01T00:00:00.000Z",
  })
  @IsDateString()
  from!: string;

  @ApiProperty({
    description: "Inclusive historical range end.",
    example: "2026-08-12T00:00:00.000Z",
  })
  @IsDateString()
  to!: string;
}
