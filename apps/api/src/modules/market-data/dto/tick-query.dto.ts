import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class TickQueryDto {
  @ApiProperty()
  @IsUUID()
  instrumentId!: string;

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
