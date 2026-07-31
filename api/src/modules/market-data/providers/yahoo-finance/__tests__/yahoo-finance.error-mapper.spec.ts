import { YahooFinanceErrorMapper } from "../yahoo-finance.error-mapper";

describe("YahooFinanceErrorMapper", () => {
  let mapper: YahooFinanceErrorMapper;

  beforeEach(() => {
    mapper = new YahooFinanceErrorMapper();
  });

  describe("classify", () => {
    it("classifies isInvalidSymbol as symbol_not_found — MD-004's 'Invalid Symbol' case", () => {
      expect(mapper.classify({ isInvalidSymbol: true })).toBe("symbol_not_found");
    });

    it("classifies isTimeout as provider_outage — MD-004's 'Timeout' case", () => {
      expect(mapper.classify({ isTimeout: true })).toBe("provider_outage");
    });

    it("classifies isNetworkError as provider_outage — MD-004's 'Network Error' case", () => {
      expect(mapper.classify({ isNetworkError: true })).toBe("provider_outage");
    });

    it("classifies isProviderUnavailable as provider_outage — MD-004's 'Provider Unavailable' case (also covers crumb/cookie negotiation failure)", () => {
      expect(mapper.classify({ isProviderUnavailable: true })).toBe("provider_outage");
    });

    it("classifies isParsingError as unknown — MD-004's 'Parsing Error' case", () => {
      expect(mapper.classify({ isParsingError: true })).toBe("unknown");
    });

    it("classifies isUnexpectedResponse as unknown — MD-004's 'Unexpected Response' case", () => {
      expect(mapper.classify({ isUnexpectedResponse: true })).toBe("unknown");
    });

    it("falls back to httpStatus classification when no envelope flag is set", () => {
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

    it("prioritizes isInvalidSymbol over any co-present httpStatus", () => {
      expect(mapper.classify({ isInvalidSymbol: true, httpStatus: 200 })).toBe("symbol_not_found");
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
