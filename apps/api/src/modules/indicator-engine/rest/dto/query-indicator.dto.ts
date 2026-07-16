import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

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

  @ApiPropertyOptional({ default: 1, minimum: 1, description: "Phase 5 security review finding: previously had no type/range validation at the DTO layer — a non-numeric or negative value would have survived to the controller's own pagination math as NaN. Closed to match AI-101's own established pagination DTO convention." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;
}
