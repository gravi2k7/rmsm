import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

/**
 * WM-020B — extends the pre-existing (Module 002) email/password-only
 * `RegisterDto` with the fields the new `/signup` enterprise trial page
 * collects: `firstName`, `lastName`, `acceptTerms`. All three are
 * `@IsOptional()` rather than required, deliberately — `test/auth-flow
 * .e2e-spec.ts` (Module 002) already registers with a bare
 * `{ email, password }` body and asserts `201`; making these fields
 * required would break that existing, passing flow. The enterprise
 * `/signup` form always sends all three, so in practice every new caller
 * gets full validation; a hypothetical bare email/password caller keeps
 * working exactly as before.
 *
 * Password strength (min 12 chars, upper/lower/number/symbol) is enforced
 * by the existing `PasswordService.assertPolicy()` — already called from
 * `hash()` — not duplicated here at the DTO layer.
 */
export class RegisterDto {
  @ApiProperty({ example: "trader@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Str0ng!Passw0rd", minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiPropertyOptional({ example: "Jane" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({ example: "Trader" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Must be true when provided. Omit entirely for the legacy email/password-only registration path.",
  })
  @IsOptional()
  @IsBoolean()
  @Equals(true, { message: "You must accept the Terms of Service to register." })
  acceptTerms?: boolean;

  /**
   * WM-020D — used to name the organization auto-created once this
   * account's email is verified (see OnboardingService). Optional: when
   * omitted, the organization is named "<firstName>'s Organization" per
   * WM-020D's own naming rule.
   */
  @ApiPropertyOptional({ example: "Acme Trading Desk" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  /**
   * WM-020E — set when this registration originated from an organization
   * invitation link (`/invitations/accept?token=...` routed an
   * unauthenticated visitor here). Carried through to email verification
   * (see AuthService.issueEmailVerification()) so OnboardingService can
   * accept the invitation automatically instead of creating a new
   * organization, per WM-020D's "Existing Invitation" requirement.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invitationToken?: string;
}
