import * as argon2 from "argon2";

/**
 * The one and only Argon2id parameter set used to hash passwords anywhere
 * in this codebase — extracted from `api/src/modules/auth/services/
 * password.service.ts` (AUTH-004) so `PasswordService` (Authentication)
 * and `prisma/seed.ts`'s bootstrap-administrator step (packages/database,
 * which cannot depend on `apps/api`'s NestJS-DI-scoped `PasswordService`)
 * both call the exact same function instead of two independently
 * maintained copies of the same argon2 call. Argon2id (not argon2i or
 * bcrypt) per OWASP recommendation — resistant to both GPU cracking and
 * side-channel attacks.
 */
export const ARGON2ID_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB, OWASP 2023 minimum
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hashes a plaintext password with this codebase's one Argon2id parameter set. Callers that need policy enforcement first (e.g. `PasswordService.hash()`) must call `checkPasswordPolicy`/`assertPolicy` themselves — this function only hashes. */
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2ID_HASH_OPTIONS);
}

/** Verifies a plaintext password against a hash produced by {@link hashPassword}. */
export function verifyPasswordHash(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}
