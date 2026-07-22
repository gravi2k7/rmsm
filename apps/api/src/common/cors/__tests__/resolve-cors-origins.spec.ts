import { resolveCorsOrigins } from "../resolve-cors-origins";

describe("resolveCorsOrigins (SEC-001 fix)", () => {
  it("is fully permissive for local development", () => {
    const result = resolveCorsOrigins({ APP_ENV: "local", CORS_ALLOWED_ORIGINS: [], WEB_APP_URL: "http://localhost:3000" });
    expect(result).toBe(true);
  });

  it("is fully permissive for local even if CORS_ALLOWED_ORIGINS happens to be set", () => {
    const result = resolveCorsOrigins({ APP_ENV: "local", CORS_ALLOWED_ORIGINS: ["https://example.com"], WEB_APP_URL: "http://localhost:3000" });
    expect(result).toBe(true);
  });

  it("uses the explicit CORS_ALLOWED_ORIGINS allowlist in production when set", () => {
    const result = resolveCorsOrigins({
      APP_ENV: "production",
      CORS_ALLOWED_ORIGINS: ["https://app.example.com", "https://admin.example.com"],
      WEB_APP_URL: "https://app.example.com",
    });
    expect(result).toEqual(["https://app.example.com", "https://admin.example.com"]);
  });

  it("uses the explicit CORS_ALLOWED_ORIGINS allowlist in staging when set", () => {
    const result = resolveCorsOrigins({
      APP_ENV: "staging",
      CORS_ALLOWED_ORIGINS: ["https://staging.example.com"],
      WEB_APP_URL: "https://staging.example.com",
    });
    expect(result).toEqual(["https://staging.example.com"]);
  });

  it("REGRESSION (SEC-001): falls back to [WEB_APP_URL] in production when CORS_ALLOWED_ORIGINS is not set — never an empty array", () => {
    const result = resolveCorsOrigins({ APP_ENV: "production", CORS_ALLOWED_ORIGINS: [], WEB_APP_URL: "https://app.example.com" });
    expect(result).toEqual(["https://app.example.com"]);
    expect(result).not.toEqual([]);
  });

  it("REGRESSION (SEC-001): falls back to [WEB_APP_URL] in staging when CORS_ALLOWED_ORIGINS is not set", () => {
    const result = resolveCorsOrigins({ APP_ENV: "staging", CORS_ALLOWED_ORIGINS: [], WEB_APP_URL: "https://staging.example.com" });
    expect(result).toEqual(["https://staging.example.com"]);
  });

  it("never returns `true` (fully permissive) for a non-local APP_ENV, even with no configuration at all", () => {
    const result = resolveCorsOrigins({ APP_ENV: "production", CORS_ALLOWED_ORIGINS: [], WEB_APP_URL: "https://app.example.com" });
    expect(result).not.toBe(true);
  });
});
