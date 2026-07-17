import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

const CATEGORY_VALUES = ["TREND_FOLLOWING", "MEAN_REVERSION", "MOMENTUM", "BREAKOUT", "SCALPING", "SWING", "ARBITRAGE", "MARKET_MAKING", "CUSTOM"] as const;

export class CreateStrategyDto {
  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ enum: CATEGORY_VALUES })
  @IsIn(CATEGORY_VALUES)
  category!: (typeof CATEGORY_VALUES)[number];
}
