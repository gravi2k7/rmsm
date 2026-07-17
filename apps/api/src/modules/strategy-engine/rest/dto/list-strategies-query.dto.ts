import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const STATUS_VALUES = ["ACTIVE", "ARCHIVED"] as const;
const CATEGORY_VALUES = ["TREND_FOLLOWING", "MEAN_REVERSION", "MOMENTUM", "BREAKOUT", "SCALPING", "SWING", "ARBITRAGE", "MARKET_MAKING", "CUSTOM"] as const;

/** Backs both GET /strategies and GET /strategies/search — see `ListStrategiesQuery`'s own comment for why these are one operation, not two. */
export class ListStrategiesQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];

  @ApiPropertyOptional({ enum: CATEGORY_VALUES })
  @IsOptional()
  @IsIn(CATEGORY_VALUES)
  category?: (typeof CATEGORY_VALUES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: "Free-text search over the strategy's own name." })
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
