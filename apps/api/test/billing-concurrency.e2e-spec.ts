import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { createHmac, randomUUID } from "crypto";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/** Concurrency & idempotency (e2e) — Phase 5's explicit requirement, mirroring Module 003 Phase 5's Promise.all()-based concurrency suite. */
describe("Billing Concurrency & Idempotency (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;
  const mockWebhookSecret = "mock-webhook-secret-dev-only";

  function signMockPayload(payload: object): { body: string; signature: string } {
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", mockWebhookSecret).update(body).digest("hex");
    return { body, signature };
  }

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    owner = await createAuthenticatedActor(app);
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("exactly one of N concurrent subscription-creation requests for the same organization succeeds", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-sub-${Date.now()}` });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post(`/api/v1/billing/organizations/${org.id}/subscription`)
          .set("Authorization", bearer(owner.accessToken))
          .send({ planKey: "free", billingCycle: "MONTHLY", billingEmail: owner.email }),
      ),
    );

    const successCount = results.filter((r) => r.status === 201).length;
    expect(successCount).toBe(1);

    const subscriptionCount = await prisma.organizationSubscription.count({ where: { organizationId: org.id } });
    expect(subscriptionCount).toBe(1); // the database-level @unique is the backstop even if the app-layer check raced
  });

  it("N concurrent deliveries of the exact same webhook event process it exactly once", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-webhook-${Date.now()}` });
    await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${org.id}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "free", billingCycle: "MONTHLY", billingEmail: owner.email });
    const subscription = await prisma.organizationSubscription.findUniqueOrThrow({
      where: { organizationId: org.id },
    });

    const eventId = `evt_${randomUUID()}`;
    const { body, signature } = signMockPayload({
      id: eventId,
      type: "payment.succeeded",
      subscriptionId: subscription.providerSubscriptionId,
      transactionId: `txn_${randomUUID()}`,
      amountCents: 1000,
      currency: "USD",
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post("/api/v1/billing/webhooks/mock")
          .set("Content-Type", "application/json")
          .set("x-mock-signature", signature)
          .send(body),
      ),
    );

    expect(results.every((r) => r.status === 200)).toBe(true);
    const processedCount = results.filter((r) => r.body.status === "processed").length;
    expect(processedCount).toBe(1); // exactly one delivery actually processed it

    const webhookRows = await prisma.paymentWebhook.count({ where: { providerEventId: eventId } });
    expect(webhookRows).toBe(1); // the unique constraint (ADR-015) held under concurrency, not just sequential calls

    const paymentCount = await prisma.payment.count({ where: { organizationId: org.id, amountCents: 1000 } });
    expect(paymentCount).toBe(1);
  });

  it("concurrent plan-change requests leave the subscription on exactly one plan, never a corrupted intermediate state", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-planchange-${Date.now()}` });
    await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${org.id}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "free", billingCycle: "MONTHLY", billingEmail: owner.email });

    await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/v1/billing/organizations/${org.id}/subscription`)
        .set("Authorization", bearer(owner.accessToken))
        .send({ planKey: "starter" }),
      request(app.getHttpServer())
        .patch(`/api/v1/billing/organizations/${org.id}/subscription`)
        .set("Authorization", bearer(owner.accessToken))
        .send({ planKey: "professional" }),
    ]);

    const subscription = await prisma.organizationSubscription.findUniqueOrThrow({
      where: { organizationId: org.id },
      include: { plan: true },
    });
    expect(["starter", "professional"]).toContain(subscription.plan.key);
  });
});
