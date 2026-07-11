import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiProperty({ required: false, description: "TOTP code, required only if 2FA is enabled." })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
