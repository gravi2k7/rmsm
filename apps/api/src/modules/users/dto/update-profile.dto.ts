import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty({ required: false, example: "America/New_York" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false, example: "en" })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, type: "object" })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, boolean>;
}
