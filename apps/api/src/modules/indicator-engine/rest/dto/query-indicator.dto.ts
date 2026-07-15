import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

const CATEGORY_VALUES = ["TREND", "MOMENTUM", "VOLATILITY", "VOLUME", "MARKET_STRUCTURE", "PATTERN_RECOGNITION", "COMPOSITE", "CUSTOM", "EXPERIMENTAL"] as const;

export class QueryIndicatorDto {
  @ApiPropertyOptional({ enum: CATEGORY_VALUES })
  @IsOptional()
  @IsString()
  category?: (typeof CATEGORY_VALUES)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1 })
  @IsOptional()
  pageSize?: number;
}
