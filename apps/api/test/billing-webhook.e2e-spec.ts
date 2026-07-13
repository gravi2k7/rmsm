import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { createHmac, randomUUID } from "crypto";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Webhook processing (e2e) — Phase 5's other explicit focus area. Uses the
 * MOCK provider's real (if simplified) HMAC signing scheme
 * (MockProvider.verifyWebhookSignature) rather than a fake/bypassed check,
 * so this genuinely exercises WebhookController → WebhookService →
 * MockProvider.verifyWebhookSignature/parseWebhookEvent → PaymentService,
 * the full path a real Stripe/Razorpay/PayPal webhook would take.
 */
describe("Billing Webhooks (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;
  let organizationId: string;
  const mockWebhookSecret = "mock-webhook-secret-dev-only"; // matches MOCK_WEBHOOK_SECRET's schema default

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
    const org = await createTestOrganization(owner.userId, { slug: `test-org-webhook-${Date.now()}` });
    organizationId = org.id;

    await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "free", billingCycle: "MONTHLY", billingEmail: owner.email });
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("processes a valid payment.succeeded event and records a Payment row", async () => {
    const subscription = await prisma.organizationSubscription.findUniqueOrThrow({ where: { organizationId } });
    const { body, signature } = signMockPayload({
      id: `evt_${randomUUID()}`,
      type: "payment.succeeded",
      subscriptionId: subscription.providerSubscriptionId,
      transactionId: `txn_${randomUUID()}`,
      amountCents: 2900,
      currency: "USD",
    });

    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/webhooks/mock")
      .set("Content-Type", "application/json")
      .set("x-mock-signature", signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("processed");

    const payment = await prisma.payment.findFirst({ where: { organizationId, status: "SUCCESS" } });
    expect(payment).not.toBeNull();
    expect(payment?.amountCents).toBe(2900);
  });

  it("idempotency: redelivering the exact same event is recognized as a duplicate, not reprocessed", async () => {
    const subscription = await prisma.organizationSubscription.findUniqueOrThrow({ where: { organizationId } });
    const eventId = `evt_${randomUUID()}`;
    const payload = {
      id: eventId,
      type: "payment.succeeded",
      subscriptionId: subscription.providerSubscriptionId,
      transactionId: `txn_${randomUUID()}`,
      amountCents: 500,
      currency: "USD",
    };
    const { body, signature } = signMockPayload(payload);

    const firstRes = await request(app.getHttpServer())
      .post("/api/v1/billing/webhooks/mock")
      .set("Content-Type", "application/json")
      .set("x-mock-signature", signature)
      .send(body);
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.status).toBe("processed");

    const secondRes = await request(app.getHttpServer())
      .post("/api/v1/billing/webhooks/mock")
      .set("Content-Type", "application/json")
      .set("x-mock-signature", signature)
      .send(body);
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.status).toBe("duplicate");

    const paymentCount = await prisma.payment.count({ where: { organizationId, amountCents: 500 } });
    expect(paymentCount).toBe(1); // not 2 — the duplicate delivery did not create a second row
  });

  it("rejects a webhook with an invalid signature", async () => {
    const { body } = signMockPayload({ id: `evt_${randomUUID()}`, type: "payment.succeeded", amountCents: 100 });

    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/webhooks/mock")
      .set("Content-Type", "application/json")
      .set("x-mock-signature", "0000000000000000000000000000000000000000000000000000000000000000")
      .send(body);
    expect(res.status).toBe(400);
  });

  it("rejects a webhook with a missing signature header", async () => {
    const { body } = signMockPayload({ id: `evt_${randomUUID()}`, type: "payment.succeeded", amountCents: 100 });

    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/webhooks/mock")
      .set("Content-Type", "application/json")
      .send(body);
    expect(res.status).toBe(400);
  });

  it("rejects a webhook for an unknown provider", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/webhooks/not-a-real-provider")
      .set("Content-Type", "application/json")
      .set("x-mock-signature", "irrelevant")
      .send(JSON.stringify({ id: "evt_1", type: "payment.succeeded" }));
    expect(res.status).toBe(400);
  });

  it("processes a payment.failed event without error, recording it with FAILED status", async () => {
    const subscription = await prisma.organizationSubscription.findUniqueOrThrow({ where: { organizationId } });
    const { body, signature } = signMockPayload({
      id: `evt_${randomUUID()}`,
      type: "payment.failed",
      subscriptionId: subscription.providerSubscriptionId,
      transactionId: `txn_${randomUUID()}`,
      amountCents: 2900,
      currency: "USD",
    });

    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/webhooks/mock")
      .set("Content-Type", "application/json")
      .set("x-mock-signature", signature)
      .send(body);

    expect(res.status).toBe(200);
    const payment = await prisma.payment.findFirst({ where: { organizationId, status: "FAILED" } });
    expect(payment).not.toBeNull();
  });
});
