import { StripeProvider } from "../stripe.provider";
import type { Env } from "@rmsm/config";

function buildTestConfig(overrides: Partial<Env> = {}): Env {
  return {
    STRIPE_API_BASE: "https://api.stripe.com/v1",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
    WEB_APP_URL: "https://app.example.com",
    ...overrides,
  } as Env;
}

describe("StripeProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("enabled", () => {
    it("is enabled when both Stripe credentials are present", () => {
      const provider = new StripeProvider(buildTestConfig());
      expect(provider.enabled).toBe(true);
    });

    it("is disabled when Stripe credentials are absent (not broken)", () => {
      const provider = new StripeProvider(buildTestConfig({ STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined }));
      expect(provider.enabled).toBe(false);
    });
  });

  describe("createCheckoutSession", () => {
    it("builds success/cancel URLs from the injected, validated config — not raw process.env", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "cs_123", url: "https://checkout.stripe.com/cs_123" }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      // Deliberately different from the injected config's WEB_APP_URL —
      // proves the provider reads the injected value, not process.env.
      process.env.WEB_APP_URL = "http://this-should-not-be-used.invalid";

      const provider = new StripeProvider(buildTestConfig({ WEB_APP_URL: "https://real-app.example.com" }));
      await provider.createCheckoutSession("cus_123", "price_123");

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = (init.body as URLSearchParams).toString();
      const decoded = decodeURIComponent(body);

      expect(decoded).toContain("success_url=https://real-app.example.com/billing/success");
      expect(decoded).toContain("cancel_url=https://real-app.example.com/billing/cancelled");
      expect(decoded).not.toContain("this-should-not-be-used.invalid");

      delete process.env.WEB_APP_URL;
    });

    it("throws a descriptive error when Stripe returns a non-OK response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: () => Promise.resolve({ error: { message: "Invalid customer" } }),
      }) as unknown as typeof fetch;

      const provider = new StripeProvider(buildTestConfig());
      await expect(provider.createCheckoutSession("cus_bad", "price_123")).rejects.toThrow("Invalid customer");
    });
  });
});
