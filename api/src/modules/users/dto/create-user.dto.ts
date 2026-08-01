import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Admin-facing user creation. Deliberately has no `password` field — the
 * created account gets `passwordHash: null` (the same state OAuth-only
 * users are already in, per `UserRepository.create()`'s existing
 * default) and is immediately sent a set-password email via the
 * existing, unmodified `AuthService.forgotPassword()` flow. This reuses
 * the platform's one password-token-issuing code path instead of adding
 * a second way to set a password (e.g. accepting and hashing a
 * plaintext password here).
 */
export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
