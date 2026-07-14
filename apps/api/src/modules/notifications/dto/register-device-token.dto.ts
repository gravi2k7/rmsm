import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

const PLATFORM_VALUES = ["IOS", "ANDROID", "WEB"] as const;

export class RegisterDeviceTokenDto {
  @ApiProperty({ enum: PLATFORM_VALUES })
  @IsEnum(PLATFORM_VALUES)
  platform!: (typeof PLATFORM_VALUES)[number];

  @ApiProperty()
  @IsString()
  token!: string;

  @ApiPropertyOptional({ description: "Scopes the token to one organization's push provider, if the caller belongs to more than one." })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
