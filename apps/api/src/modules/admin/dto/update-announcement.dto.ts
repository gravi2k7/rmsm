import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";

const SEVERITY_VALUES = ["INFO", "WARNING", "CRITICAL"] as const;

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ enum: SEVERITY_VALUES })
  @IsOptional()
  @IsEnum(SEVERITY_VALUES)
  severity?: (typeof SEVERITY_VALUES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
