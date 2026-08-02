import { AlphaVantageErrorMapper } from "../alphavantage.error-mapper";

describe("AlphaVantageErrorMapper", () => {
  let mapper: AlphaVantageErrorMapper;

  beforeEach(() => {
    mapper = new AlphaVantageErrorMapper();
  });

  describe("classify", () => {
    it("classifies isEmptyResult (empty 'Global Quote': {}) as symbol_not_found — MD-003's '404 Symbol Not Found' case, since Alpha Vantage never actually 404s", () => {
      expect(mapper.classify({ isEmptyResult: true })).toBe("symbol_not_found");
    });

    it("classifies a Note-flagged rate-limit message as rate_limited", () => {
      expect(mapper.classify({ isNoteRateLimit: true, message: "Thank you for using Alpha Vantage!" })).toBe("rate_limited");
    });

    it("classifies isTimeout and isNetworkFailure as provider_outage", () => {
      expect(mapper.classify({ isTimeout: true })).toBe("provider_outage");
      expect(mapper.classify({ isNetworkFailure: true })).toBe("provider_outage");
    });

    it("classifies an Information message mentioning the API key or premium tier as authentication_failed", () => {
      expect(mapper.classify({ isInformationMessage: true, message: "The **apikey** is invalid." })).toBe("authentication_failed");
      expect(mapper.classify({ isInformationMessage: true, message: "This is a premium endpoint." })).toBe("authentication_failed");
    });

    it("classifies any other Information message as rate_limited (Alpha Vantage's newer daily-limit signal)", () => {
      expect(mapper.classify({ isInformationMessage: true, message: "You have reached the daily rate limit." })).toBe("rate_limited");
    });

    it("classifies an Error Message mentioning the API key as authentication_failed, otherwise as invalid_request", () => {
      expect(mapper.classify({ isErrorMessage: true, message: "the apikey provided is invalid" })).toBe("authentication_failed");
      expect(mapper.classify({ isErrorMessage: true, message: "Invalid API call. Please retry or visit the documentation." })).toBe(
        "invalid_request",
      );
    });

    it("classifies isMalformedResponse as unknown", () => {
      expect(mapper.classify({ isMalformedResponse: true })).toBe("unknown");
    });

    it("falls back to httpStatus classification when none of the envelope flags are set", () => {
      expect(mapper.classify({ httpStatus: 404 })).toBe("symbol_not_found");
      expect(mapper.classify({ httpStatus: 401 })).toBe("authentication_failed");
      expect(mapper.classify({ httpStatus: 403 })).toBe("authentication_failed");
      expect(mapper.classify({ httpStatus: 429 })).toBe("rate_limited");
      expect(mapper.classify({ httpStatus: 400 })).toBe("invalid_request");
      expect(mapper.classify({ httpStatus: 500 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 502 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 503 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 504 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 418 })).toBe("unknown");
    });

    it("classifies an unrecognized shape as unknown", () => {
      expect(mapper.classify(new Error("boom"))).toBe("unknown");
      expect(mapper.classify(undefined)).toBe("unknown");
      expect(mapper.classify("just a string")).toBe("unknown");
    });

    it("prioritizes isEmptyResult over any co-present httpStatus", () => {
      expect(mapper.classify({ isEmptyResult: true, httpStatus: 200 })).toBe("symbol_not_found");
    });
  });

  describe("isRetryable", () => {
    it("is retryable only for rate_limited and provider_outage", () => {
      expect(mapper.isRetryable("rate_limited")).toBe(true);
      expect(mapper.isRetryable("provider_outage")).toBe(true);
      expect(mapper.isRetryable("authentication_failed")).toBe(false);
      expect(mapper.isRetryable("symbol_not_found")).toBe(false);
      expect(mapper.isRetryable("invalid_request")).toBe(false);
      expect(mapper.isRetryable("unknown")).toBe(false);
    });
  });
});
