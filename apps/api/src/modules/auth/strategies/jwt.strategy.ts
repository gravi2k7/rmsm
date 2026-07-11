import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";
import type { AccessTokenPayload } from "../services/token.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@Inject(APP_CONFIG) config: Env) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.JWT_ACCESS_SECRET,
    });
  }

  /** Return value becomes `request.user` — the raw, already-verified JWT payload. */
  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
