import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

export class ValidateIndicatorDto {
  @ApiProperty()
  @IsString()
  indicatorIdentifier!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, number | string | boolean>;

  @ApiProperty()
  @IsString()
  timeframe!: string;
}
