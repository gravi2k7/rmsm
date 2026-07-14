import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

const CHANNEL_VALUES = ["EMAIL", "SMS", "PUSH", "IN_APP", "WEBHOOK"] as const;

export class UpdatePreferenceDto {
  @ApiPropertyOptional({ description: "Omit to set the org-wide default for all categories." })
  @IsOptional()
  @IsString()
  categoryKey?: string;

  @ApiPropertyOptional({ enum: CHANNEL_VALUES, description: "Omit to apply to all channels." })
  @IsOptional()
  @IsEnum(CHANNEL_VALUES)
  channel?: (typeof CHANNEL_VALUES)[number];

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
