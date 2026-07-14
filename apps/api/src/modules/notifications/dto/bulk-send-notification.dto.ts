import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from "class-validator";
import { SendNotificationDto } from "./send-notification.dto";

export class BulkSendNotificationDto {
  @ApiProperty({ type: [SendNotificationDto], maxItems: 1000 })
  @ValidateNested({ each: true })
  @Type(() => SendNotificationDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  notifications!: SendNotificationDto[];
}
