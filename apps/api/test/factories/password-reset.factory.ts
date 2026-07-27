import { randomBytes, createHash } from "crypto";
import { prisma, PasswordReset } from "@rmsm/database";

/** Same rationale as email-verification.factory.ts / invitation.factory.ts — a known raw token for exercising `POST /auth/reset-password` end-to-end. */
export async function createTestPasswordReset(
  userId: string,
  overrides: { expiresAt?: Date; usedAt?: Date | null } = {},
): Promise<{ passwordReset: PasswordReset; rawToken: string }> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const passwordReset = await prisma.passwordReset.create({
    data: {
      userId,
      tokenHash,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      usedAt: overrides.usedAt ?? null,
    },
  });

  return { passwordReset, rawToken };
}
