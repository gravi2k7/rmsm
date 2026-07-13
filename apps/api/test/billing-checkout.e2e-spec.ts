import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Checkout / subscription-creation flow (e2e) — Phase 5's explicit focus
 * area. "Checkout" in this module means POST .../subscription with the
 * MOCK provider (no real payment UI exists yet, and none should per this
 * phase's "no new features" constraint) — this exercises the exact same
 * SubscriptionService.createSubscription() path a real Stripe/Razorpay/
 * PayPal checkout would eventually call, just via MockProvider.createSubscription()
 * instead of a real provider round-trip.
 */
describe("Billing Checkout (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;
  let organizationId: string;

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    owner = await createAuthenticatedActor(app);
    const org = await createTestOrganization(owner.userId, { slug: `test-org-checkout-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("creates a subscription on the free plan (no trial) and it is immediately ACTIVE", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "free", billingCycle: "MONTHLY", billingEmail: owner.email });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("ACTIVE");
    expect(res.body.paymentProvider).toBe("MOCK");
  });

  it("rejects creating a second subscription for the same organization", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "starter", billingCycle: "MONTHLY", billingEmail: owner.email });
    expect(res.status).toBe(409);
  });

  it("rejects an unknown plan key", async () => {
    const otherOrg = await createTestOrganization(owner.userId, { slug: `test-org-checkout-badplan-${Date.now()}` });
    const res = await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${otherOrg.id}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "does-not-exist", billingCycle: "MONTHLY", billingEmail: owner.email });
    expect(res.status).toBe(404);
  });

  it("a paid plan with a trial period starts TRIALING, not ACTIVE", async () => {
    const trialOrg = await createTestOrganization(owner.userId, { slug: `test-org-checkout-trial-${Date.now()}` });
    const res = await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${trialOrg.id}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "starter", billingCycle: "MONTHLY", billingEmail: owner.email });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("TRIALING");
    expect(res.body.trialEndsAt).not.toBeNull();
  });

  it("changes plan, then reads back the updated subscription", async () => {
    const changeRes = await request(app.getHttpServer())
      .patch(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "starter" });
    expect(changeRes.status).toBe(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken));
    expect(getRes.status).toBe(200);
    expect(getRes.body.plan.key).toBe("starter");
  });

  it("cancels the subscription", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");

    const subscription = await prisma.organizationSubscription.findUnique({ where: { organizationId } });
    expect(subscription?.cancellationDate).not.toBeNull();
  });

  it("rejects cancelling an already-cancelled subscription", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(409);
  });
});
