import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from "class-validator";

const CHANNEL_VALUES = ["EMAIL", "SMS", "PUSH", "IN_APP", "WEBHOOK"] as const;
const FORMAT_VALUES = ["HTML", "TEXT", "MARKDOWN"] as const;

export class CreateTemplateDto {
  @ApiProperty({ example: "welcome_email" })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: CHANNEL_VALUES })
  @IsEnum(CHANNEL_VALUES)
  channel!: (typeof CHANNEL_VALUES)[number];

  @ApiPropertyOptional({ enum: FORMAT_VALUES, default: "HTML" })
  @IsOptional()
  @IsEnum(FORMAT_VALUES)
  format?: (typeof FORMAT_VALUES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiProperty()
  @IsString()
  bodyTemplate!: string;

  @ApiPropertyOptional({ description: "References another template as a reusable layout wrapper." })
  @IsOptional()
  @IsUUID()
  layoutId?: string;

  @ApiPropertyOptional({ default: "en" })
  @IsOptional()
  @IsString()
  locale?: string;
}
