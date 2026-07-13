import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsObject, IsString } from "class-validator";

const SMS_PROVIDER_TYPE_VALUES = ["TWILIO", "MESSAGEBIRD", "VONAGE", "AWS_SNS"] as const;

export class CreateSmsProviderDto {
  @ApiProperty({ enum: SMS_PROVIDER_TYPE_VALUES })
  @IsEnum(SMS_PROVIDER_TYPE_VALUES)
  type!: (typeof SMS_PROVIDER_TYPE_VALUES)[number];

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  fromNumber!: string;

  @ApiProperty({ type: "object" })
  @IsObject()
  credentials!: Record<string, unknown>;
}
