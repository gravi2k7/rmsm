import { Inject, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { checkPasswordPolicy, DEFAULT_PASSWORD_POLICY, ValidationError } from "@rmsm/shared";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * Argon2id password hashing + policy enforcement. Argon2id (not argon2i or
 * bcrypt) is used per OWASP recommendation — resistant to both GPU cracking
 * and side-channel attacks.
 */
@Injectable()
export class PasswordService {
  constructor(@Inject(APP_CONFIG) private readonly config: Env) {}

  async hash(plain: string): Promise<string> {
    this.assertPolicy(plain);
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB, OWASP 2023 minimum
      timeCost: 2,
      parallelism: 1,
    });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  assertPolicy(plain: string): void {
    const result = checkPasswordPolicy(plain, {
      ...DEFAULT_PASSWORD_POLICY,
      minLength: this.config.PASSWORD_MIN_LENGTH,
    });
    if (!result.valid) {
      throw new ValidationError("Password does not meet security requirements.", {
        failures: result.failures,
      });
    }
  }
}
