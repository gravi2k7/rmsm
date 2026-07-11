import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService, AuthTokens } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { VerifyTwoFactorDto } from "./dto/verify-two-factor.dto";
import { DisableTwoFactorDto } from "./dto/disable-two-factor.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import type { AccessTokenPayload } from "./services/token.service";

function requestContext(req: Request): { ipAddress?: string; userAgent?: string } {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a new account. Sends an email verification link." })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<{ message: string }> {
    return this.authService.register(dto.email, dto.password, requestContext(req));
  }

  @Public()
  @Post("verify-email")
  @ApiOperation({ summary: "Verify an account's email address." })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post("login")
  @ApiOperation({ summary: "Log in with email/password. If 2FA is enabled, twoFactorCode is required." })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{ requiresTwoFactor: true } | { tokens: AuthTokens; sessionId: string }> {
    // LocalAuthGuard has already validated credentials and attached the user to req.user
    const user = req.user as { id: string };

    const twoFactorEnabled = await this.authService.isTwoFactorEnabled(user.id);
    if (twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        return { requiresTwoFactor: true };
      }
      const valid = await this.authService.verifyTwoFactorForLogin(user.id, dto.twoFactorCode);
      if (!valid) throw new UnauthorizedException("Invalid 2FA code.");
    }

    return this.authService.issueSession(user.id, requestContext(req));
  }

  @Public()
  @Post("refresh")
  @ApiOperation({ summary: "Rotate a refresh token for a new access/refresh token pair." })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken, requestContext(req));
  }

  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log out the current session." })
  logout(@CurrentUser() user: AccessTokenPayload, @Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(user.sub, user.sessionId, dto.refreshToken);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a password reset email." })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password using a reset token." })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @ApiBearerAuth()
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change password while authenticated." })
  changePassword(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Return the authenticated user's token claims." })
  me(@CurrentUser() user: AccessTokenPayload): AccessTokenPayload {
    return user;
  }

  // ── 2FA ──────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post("2fa/setup")
  @ApiOperation({ summary: "Begin 2FA setup — returns a QR code to scan in an authenticator app." })
  setupTwoFactor(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ otpauthUrl: string; qrCodeDataUrl: string }> {
    return this.authService.setupTwoFactor(user.sub);
  }

  @ApiBearerAuth()
  @Post("2fa/confirm")
  @ApiOperation({ summary: "Confirm 2FA setup with a code from the authenticator app. Returns recovery codes." })
  confirmTwoFactor(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: VerifyTwoFactorDto,
  ): Promise<{ message: string; recoveryCodes: string[] }> {
    return this.authService.confirmTwoFactor(user.sub, dto.code);
  }

  @ApiBearerAuth()
  @Post("2fa/disable")
  @ApiOperation({ summary: "Disable 2FA (requires password confirmation)." })
  disableTwoFactor(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<{ message: string }> {
    return this.authService.disableTwoFactor(user.sub, dto.password);
  }
}
