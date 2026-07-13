import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

const CHANNEL_VALUES = ["EMAIL", "SMS", "PUSH", "IN_APP", "WEBHOOK"] as const;
const TYPE_VALUES = ["DIRECT", "BROADCAST", "ROLE", "PERMISSION", "TOPIC"] as const;
const PRIORITY_VALUES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export class SendNotificationDto {
  @ApiProperty({ enum: TYPE_VALUES })
  @IsEnum(TYPE_VALUES)
  type!: (typeof TYPE_VALUES)[number];

  @ApiProperty({ enum: CHANNEL_VALUES })
  @IsEnum(CHANNEL_VALUES)
  channel!: (typeof CHANNEL_VALUES)[number];

  @ApiPropertyOptional({ enum: PRIORITY_VALUES, default: "NORMAL" })
  @IsOptional()
  @IsEnum(PRIORITY_VALUES)
  priority?: (typeof PRIORITY_VALUES)[number];

  @ApiPropertyOptional({ description: "Required when type=DIRECT" })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiPropertyOptional({ description: "Required when type=ROLE" })
  @IsOptional()
  @IsString()
  recipientRole?: string;

  @ApiPropertyOptional({ description: "Required when type=PERMISSION" })
  @IsOptional()
  @IsString()
  recipientPermission?: string;

  @ApiPropertyOptional({ description: "Required when type=TOPIC" })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryKey?: string;

  @ApiPropertyOptional({ description: "If set, renders this template instead of using subject/body directly." })
  @IsOptional()
  @IsString()
  templateKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ type: "object" })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ default: "en" })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: "ISO 8601 — presence makes this a scheduled send." })
  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;
}
