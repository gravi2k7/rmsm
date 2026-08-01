import { Inject, Injectable } from "@nestjs/common";
import { checkPasswordPolicy, DEFAULT_PASSWORD_POLICY, hashPassword, verifyPasswordHash, ValidationError } from "@rmsm/shared";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * Argon2id password hashing + policy enforcement. Argon2id (not argon2i or
 * bcrypt) is used per OWASP recommendation — resistant to both GPU cracking
 * and side-channel attacks.
 *
 * AUTH-004 — the actual `argon2.hash()`/`argon2.verify()` calls (and their
 * one parameter set) now live in `@rmsm/shared`'s `hashPassword()`/
 * `verifyPasswordHash()`, so the bootstrap-administrator seed step
 * (`packages/database/prisma/seed.ts`, which cannot depend on this
 * NestJS-DI-scoped service) hashes its password with the exact same
 * implementation instead of a second, independently maintained copy of
 * this class's argon2 call — "reuse, don't duplicate," per AUTH-004's own
 * instruction. This class's public API and behavior are unchanged: `hash()`
 * still enforces the password policy first, `verify()` is a pure
 * pass-through, both exactly as before this refactor.
 */
@Injectable()
export class PasswordService {
  constructor(@Inject(APP_CONFIG) private readonly config: Env) {}

  async hash(plain: string): Promise<string> {
    this.assertPolicy(plain);
    return hashPassword(plain);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return verifyPasswordHash(hash, plain);
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
