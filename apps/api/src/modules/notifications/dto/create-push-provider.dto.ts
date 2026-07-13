import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsObject, IsString } from "class-validator";

const PUSH_PROVIDER_TYPE_VALUES = ["FCM", "APNS"] as const;

export class CreatePushProviderDto {
  @ApiProperty({ enum: PUSH_PROVIDER_TYPE_VALUES })
  @IsEnum(PUSH_PROVIDER_TYPE_VALUES)
  type!: (typeof PUSH_PROVIDER_TYPE_VALUES)[number];

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ type: "object" })
  @IsObject()
  credentials!: Record<string, unknown>;
}
