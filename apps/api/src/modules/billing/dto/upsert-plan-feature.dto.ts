import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from "class-validator";

export class UpsertPlanFeatureDto {
  @ApiProperty()
  @IsUUID()
  featureFlagId!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ description: "Null/omitted = unlimited (only meaningful for LIMIT-type features)." })
  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number;
}
