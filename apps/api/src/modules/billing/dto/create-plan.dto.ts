import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from "class-validator";

export class CreatePlanDto {
  @ApiProperty({ example: "professional" })
  @IsString()
  @Matches(/^[a-z0-9_]+$/, { message: "key must be lowercase letters, numbers, and underscores only" })
  key!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  monthlyPriceCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  yearlyPriceCents!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
