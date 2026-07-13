import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UsageHistoryQueryDto {
  @ApiProperty({ example: "api_calls" })
  @IsString()
  metric!: string;

  @ApiPropertyOptional({ default: 6, minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  monthsAgo: number = 6;
}
