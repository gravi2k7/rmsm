import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

const FREQUENCY_VALUES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM_CRON"] as const;
const TYPE_VALUES = ["DIRECT", "BROADCAST", "ROLE", "PERMISSION", "TOPIC"] as const;

export class ScheduleNotificationDto {
  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiProperty({ enum: FREQUENCY_VALUES })
  @IsEnum(FREQUENCY_VALUES)
  frequency!: (typeof FREQUENCY_VALUES)[number];

  @ApiPropertyOptional({ description: "Required when frequency=CUSTOM_CRON" })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiProperty()
  @IsISO8601()
  nextRunAt!: string;

  @ApiProperty({ enum: TYPE_VALUES })
  @IsEnum(TYPE_VALUES)
  targetType!: (typeof TYPE_VALUES)[number];

  @ApiPropertyOptional({ type: "object" })
  @IsOptional()
  @IsObject()
  targetValue?: Record<string, unknown>;
}
