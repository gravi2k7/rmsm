import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "trader@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Str0ng!Passw0rd", minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;
}
