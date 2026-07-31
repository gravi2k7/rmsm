import { CoinGeckoErrorMapper } from "../coingecko.error-mapper";

describe("CoinGeckoErrorMapper", () => {
  let mapper: CoinGeckoErrorMapper;

  beforeEach(() => {
    mapper = new CoinGeckoErrorMapper();
  });

  describe("classify", () => {
    it("classifies an unknown-symbol flag as symbol_not_found, taking priority over any httpStatus", () => {
      expect(mapper.classify({ isUnknownSymbol: true })).toBe("symbol_not_found");
      expect(mapper.classify({ isUnknownSymbol: true, httpStatus: 200 })).toBe("symbol_not_found");
    });

    it("classifies HTTP 404 as symbol_not_found", () => {
      expect(mapper.classify({ httpStatus: 404 })).toBe("symbol_not_found");
    });

    it("classifies HTTP 401/403 as authentication_failed", () => {
      expect(mapper.classify({ httpStatus: 401 })).toBe("authentication_failed");
      expect(mapper.classify({ httpStatus: 403 })).toBe("authentication_failed");
    });

    it("classifies HTTP 429 as rate_limited", () => {
      expect(mapper.classify({ httpStatus: 429 })).toBe("rate_limited");
    });

    it("classifies HTTP 400 as invalid_request", () => {
      expect(mapper.classify({ httpStatus: 400 })).toBe("invalid_request");
    });

    it("classifies HTTP 500/502/503/504 as provider_outage", () => {
      expect(mapper.classify({ httpStatus: 500 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 502 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 503 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 504 })).toBe("provider_outage");
    });

    it("classifies a timeout as provider_outage", () => {
      expect(mapper.classify({ isTimeout: true })).toBe("provider_outage");
    });

    it("classifies a network failure as provider_outage", () => {
      expect(mapper.classify({ isNetworkFailure: true })).toBe("provider_outage");
    });

    it("classifies an unrecognized shape or unmapped status as unknown", () => {
      expect(mapper.classify(new Error("boom"))).toBe("unknown");
      expect(mapper.classify(undefined)).toBe("unknown");
      expect(mapper.classify({ httpStatus: 418 })).toBe("unknown");
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
