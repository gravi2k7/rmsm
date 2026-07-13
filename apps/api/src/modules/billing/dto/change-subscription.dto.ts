import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ChangeSubscriptionDto {
  @ApiProperty({ example: "enterprise" })
  @IsString()
  planKey!: string;
}
