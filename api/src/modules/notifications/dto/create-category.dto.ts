import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

const CHANNEL_VALUES = ["EMAIL", "SMS", "PUSH", "IN_APP", "WEBHOOK"] as const;

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CHANNEL_VALUES })
  @IsOptional()
  @IsEnum(CHANNEL_VALUES)
  defaultChannel?: (typeof CHANNEL_VALUES)[number];
}
