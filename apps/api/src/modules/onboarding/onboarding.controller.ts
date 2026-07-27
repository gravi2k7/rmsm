import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { OnboardingService, OnboardingResult } from "./onboarding.service";
import { CompleteOnboardingDto } from "./dto/complete-onboarding.dto";
import { Public } from "../auth/decorators/public.decorator";
import { requestContext } from "../organizations/utils/request-context.util";

@ApiTags("Onboarding")
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * WM-020D/E — the frontend's `/verify-email` page calls this instead of
   * the plain `/auth/verify-email` (which still exists, unchanged, for any
   * other caller — this is additive, not a replacement). `@Public()`
   * because, same as `/auth/verify-email` itself, the caller has no
   * session yet at this point in the flow.
   */
  @Public()
  @Post("verify-email")
  @ApiOperation({
    operationId: "completeOnboarding",
    summary:
      "Verify email and complete onboarding: accepts a pending invitation if one was carried through registration, otherwise auto-creates the trader's first organization and Default Workspace, assigning them Owner.",
  })
  completeOnboarding(@Body() dto: CompleteOnboardingDto, @Req() req: Request): Promise<OnboardingResult> {
    return this.onboardingService.completeEmailVerification(
      dto.token,
      { invitationToken: dto.invitationToken, companyName: dto.companyName },
      requestContext(req),
    );
  }
}
