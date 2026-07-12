import { prisma, User } from "@rmsm/database";
import * as argon2 from "argon2";

let counter = 0;

/**
 * Creates a real, persisted User + Profile (ACTIVE, email-verified) —
 * never a mock. Integration tests exercise the real repository/service/
 * controller stack against a real database, per this phase's explicit
 * "verify the complete stack" requirement; mocking the user layer here
 * would defeat that.
 */
export async function createTestUser(overrides: { email?: string; password?: string } = {}): Promise<{
  user: User;
  email: string;
  password: string;
}> {
  counter += 1;
  const email = overrides.email ?? `test-user-${Date.now()}-${counter}@example.com`;
  const password = overrides.password ?? "Str0ng!Passw0rd123";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      profile: { create: {} },
    },
  });

  return { user, email, password };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.user.deleteMany({ where: { id: userId } });
}
