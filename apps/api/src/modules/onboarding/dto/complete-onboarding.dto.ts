import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * WM-020D/E — body for `POST /onboarding/verify-email`. `token` is the
 * same raw email-verification token `/auth/verify-email` accepts;
 * `invitationToken`/`companyName` are the two values AuthService embeds
 * as extra query params on the verification link (see
 * AuthService.issueEmailVerification()) — the `/verify-email` frontend
 * page reads all three off its own URL and forwards them here verbatim.
 */
export class CompleteOnboardingDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invitationToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;
}
