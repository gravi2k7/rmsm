import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsString, IsUrl } from "class-validator";

export class CreateNotificationWebhookDto {
  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty({ type: [String], example: ["notification.delivered", "notification.bounced"] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  eventTypes!: string[];
}
