import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class VerifyTwoFactorDto {
  @ApiProperty({ description: "6-digit TOTP code" })
  @IsString()
  @Length(6, 6)
  code!: string;
}
