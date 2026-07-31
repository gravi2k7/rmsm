import { EmailErrorMapper } from "../errors/email-error-mapper";

describe("EmailErrorMapper", () => {
  const mapper = new EmailErrorMapper();

  it.each([
    [{ isAuthenticationFailure: true }, "authentication_failure"],
    [{ isInvalidRecipient: true }, "invalid_recipient"],
    [{ isRateLimit: true }, "rate_limit"],
    [{ isQueueFailure: true }, "queue_failure"],
    [{ isProviderUnavailable: true }, "provider_unavailable"],
    [{ isTimeout: true }, "timeout"],
    [{ isSmtpFailure: true }, "smtp_failure"],
  ] as const)("classifies %o as %s", (error, expected) => {
    expect(mapper.classify(error)).toBe(expected);
  });

  it("prioritizes isAuthenticationFailure over every other flag when several are set", () => {
    expect(mapper.classify({ isAuthenticationFailure: true, isTimeout: true, isSmtpFailure: true })).toBe("authentication_failure");
  });

  it.each([
    [401, "authentication_failure"],
    [403, "authentication_failure"],
    [422, "invalid_recipient"],
    [429, "rate_limit"],
    [408, "timeout"],
    [502, "provider_unavailable"],
    [503, "provider_unavailable"],
    [504, "provider_unavailable"],
    [500, "unknown"],
  ] as const)("falls back to httpStatus %d -> %s when no boolean flag is set", (httpStatus, expected) => {
    expect(mapper.classify({ httpStatus })).toBe(expected);
  });

  it("classifies a non-EmailProviderError value as unknown", () => {
    expect(mapper.classify(new Error("boom"))).toBe("unknown");
    expect(mapper.classify(null)).toBe("unknown");
  });

  it.each(["timeout", "provider_unavailable", "rate_limit", "smtp_failure"] as const)("treats %s as retryable", (classification) => {
    expect(mapper.isRetryable(classification)).toBe(true);
  });

  it.each(["authentication_failure", "invalid_recipient", "queue_failure", "unknown"] as const)("does not treat %s as retryable", (classification) => {
    expect(mapper.isRetryable(classification)).toBe(false);
  });
});
