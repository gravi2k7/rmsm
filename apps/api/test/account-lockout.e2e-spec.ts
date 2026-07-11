import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { prisma } from "@rmsm/database";

/** Verifies the account-lockout acceptance criterion end-to-end. */
describe("Account lockout (e2e)", () => {
  let app: INestApplication;
  const email = `lockout-${Date.now()}@example.com`;
  const password = "Str0ng!Passw0rd123";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    await request(app.getHttpServer()).post("/api/v1/auth/register").send({ email, password });
    await prisma.user.update({
      where: { email },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("locks the account after ACCOUNT_LOCKOUT_MAX_ATTEMPTS consecutive failures", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: "wrong-password!" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.status).toBe("LOCKED");
    expect(user?.lockedUntil).toBeTruthy();

    // Even the correct password is rejected while locked.
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(res.status).toBe(401);
  });
});
