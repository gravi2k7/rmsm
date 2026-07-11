import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";
import { UnauthorizedError } from "@rmsm/shared";
import type { UserWithProfile } from "@rmsm/database";

/**
 * Validates email/password credentials only — does NOT check 2FA (the
 * controller handles the 2FA step explicitly so it can return a distinct
 * "2FA required" response rather than a bare 401).
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, "local") {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: "email" });
  }

  async validate(email: string, password: string): Promise<UserWithProfile> {
    const result = await this.authService.validateCredentials(email, password);
    if (!result) throw new UnauthorizedError("Invalid email or password.");
    return result;
  }
}
