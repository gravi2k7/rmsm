import { TwelveDataErrorMapper } from "../twelve-data.error-mapper";

describe("TwelveDataErrorMapper", () => {
  let mapper: TwelveDataErrorMapper;

  beforeEach(() => {
    mapper = new TwelveDataErrorMapper();
  });

  describe("classify", () => {
    it("classifies HTTP 401 as authentication_failed", () => {
      expect(mapper.classify({ httpStatus: 401 })).toBe("authentication_failed");
    });

    it("classifies HTTP 403 as authentication_failed", () => {
      expect(mapper.classify({ httpStatus: 403 })).toBe("authentication_failed");
    });

    it("classifies HTTP 404 as symbol_not_found", () => {
      expect(mapper.classify({ httpStatus: 404 })).toBe("symbol_not_found");
    });

    it("classifies HTTP 429 as rate_limited", () => {
      expect(mapper.classify({ httpStatus: 429 })).toBe("rate_limited");
    });

    it("classifies HTTP 500/502/503/504 as provider_outage", () => {
      expect(mapper.classify({ httpStatus: 500 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 502 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 503 })).toBe("provider_outage");
      expect(mapper.classify({ httpStatus: 504 })).toBe("provider_outage");
    });

    it("classifies a plain HTTP 400 as invalid_request", () => {
      expect(mapper.classify({ httpStatus: 400, message: "outputsize must be a positive integer" })).toBe("invalid_request");
    });

    it("classifies a 400 whose message names the symbol as symbol_not_found, not invalid_request", () => {
      expect(mapper.classify({ httpStatus: 400, message: '**symbol** not found: "ZZZZINVALID"' })).toBe("symbol_not_found");
    });

    it("classifies a timeout as provider_outage", () => {
      expect(mapper.classify({ isTimeout: true, message: "timed out" })).toBe("provider_outage");
    });

    it("classifies a network failure as provider_outage", () => {
      expect(mapper.classify({ isNetworkFailure: true, message: "ECONNRESET" })).toBe("provider_outage");
    });

    it("classifies an unrecognized shape as unknown", () => {
      expect(mapper.classify(new Error("boom"))).toBe("unknown");
      expect(mapper.classify("a string")).toBe("unknown");
      expect(mapper.classify(undefined)).toBe("unknown");
    });

    it("classifies an unmapped http status as unknown", () => {
      expect(mapper.classify({ httpStatus: 418 })).toBe("unknown");
    });
  });

  describe("isRetryable", () => {
    it("is retryable for rate_limited and provider_outage", () => {
      expect(mapper.isRetryable("rate_limited")).toBe(true);
      expect(mapper.isRetryable("provider_outage")).toBe(true);
    });

    it("is not retryable for authentication_failed, symbol_not_found, invalid_request, or unknown", () => {
      expect(mapper.isRetryable("authentication_failed")).toBe(false);
      expect(mapper.isRetryable("symbol_not_found")).toBe(false);
      expect(mapper.isRetryable("invalid_request")).toBe(false);
      expect(mapper.isRetryable("unknown")).toBe(false);
    });
  });
});
