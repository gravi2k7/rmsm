import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestUser } from "../factories/user.factory";
import { grantSubscriber } from "./permission.helper";

export interface TestActor {
  userId: string;
  email: string;
  accessToken: string;
}

/**
 * Registers, verifies, grants SUBSCRIBER (the tier most organization
 * actions require — see seed.ts's ORGANIZATION_MANAGEMENT_PERMISSIONS),
 * and logs in a fresh user via the REAL /auth/register + /auth/login
 * endpoints — not a shortcut that mints a JWT directly, because
 * authorization tests need the actual token-issuance path (roles/
 * permissions embedded at login time, per Module 002's design) to be
 * meaningful.
 */
export async function createAuthenticatedActor(app: INestApplication): Promise<TestActor> {
  const { email, password } = await createTestUser();

  const registerRes = await request(app.getHttpServer()).post("/api/v1/auth/register").send({ email, password });
  if (registerRes.status !== 201) {
    throw new Error(`Test setup failed: register returned ${registerRes.status}: ${JSON.stringify(registerRes.body)}`);
  }

  // Console email provider (Module 002) doesn't deliver anything test code
  // can intercept — mark the account verified directly, matching the
  // pattern already established in auth-flow.e2e-spec.ts.
  const { prisma } = await import("@rmsm/database");
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });

  await grantSubscriber(user.id);

  const loginRes = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
  if (loginRes.status !== 200 || !loginRes.body?.tokens?.accessToken) {
    throw new Error(`Test setup failed: login returned ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
  }

  return { userId: user.id, email, accessToken: loginRes.body.tokens.accessToken };
}

/** Creates an actor with no platform role grants at all — for "Guest"/insufficient-permission authorization tests. */
export async function createUnprivilegedActor(app: INestApplication): Promise<TestActor> {
  const { email, password } = await createTestUser();
  await request(app.getHttpServer()).post("/api/v1/auth/register").send({ email, password });

  const { prisma } = await import("@rmsm/database");
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
  // No grantSubscriber() call — this actor has whatever the FREE_USER-
  // equivalent default is: none, since registration doesn't auto-assign a
  // platform role in Module 002. Deliberately minimal for negative tests.

  const loginRes = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
  return { userId: user.id, email, accessToken: loginRes.body.tokens.accessToken };
}

export function bearer(token: string): string {
  return `Bearer ${token}`;
}
