import { randomBytes, createHash } from "crypto";
import { prisma, EmailVerification } from "@rmsm/database";

/**
 * Creates a real, persisted EmailVerification row with a KNOWN raw token
 * returned alongside it — same rationale as factories/invitation.factory
 * .ts: production only ever stores the SHA-256 hash (the raw value is
 * emailed once and is not recoverable from the hash), but e2e tests need
 * the raw token to exercise the real `/onboarding/verify-email` and
 * `/auth/verify-email` endpoints end-to-end rather than only asserting
 * DB state directly.
 */
export async function createTestEmailVerification(
  userId: string,
  overrides: { expiresAt?: Date; verifiedAt?: Date | null } = {},
): Promise<{ verification: EmailVerification; rawToken: string }> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const verification = await prisma.emailVerification.create({
    data: {
      userId,
      tokenHash,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      verifiedAt: overrides.verifiedAt ?? null,
    },
  });

  return { verification, rawToken };
}
