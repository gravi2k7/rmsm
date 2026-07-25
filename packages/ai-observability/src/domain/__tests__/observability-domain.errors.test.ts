import { describe, it, expect } from "vitest";
import {
  AIRequestNotFoundError,
  DuplicateAIRequestError,
  InvalidTelemetryDataError,
  UnknownProviderPricingError,
} from "../errors/observability-domain.errors";

describe("observability domain errors", () => {
  it("AIRequestNotFoundError carries a stable code and useful message", () => {
    const error = new AIRequestNotFoundError("req-1");
    expect(error.code).toBe("AI_REQUEST_NOT_FOUND");
    expect(error.message).toContain("req-1");
  });

  it("DuplicateAIRequestError carries a stable code and useful message", () => {
    const error = new DuplicateAIRequestError("req-1");
    expect(error.code).toBe("DUPLICATE_AI_REQUEST");
    expect(error.message).toContain("req-1");
  });

  it("InvalidTelemetryDataError carries a stable code and the given reason", () => {
    const error = new InvalidTelemetryDataError("missing requestId");
    expect(error.code).toBe("INVALID_TELEMETRY_DATA");
    expect(error.message).toContain("missing requestId");
  });

  it("UnknownProviderPricingError carries a stable code and identifies the provider/model", () => {
    const error = new UnknownProviderPricingError("openai", "gpt-9");
    expect(error.code).toBe("UNKNOWN_PROVIDER_PRICING");
    expect(error.message).toContain("openai");
    expect(error.message).toContain("gpt-9");
  });
});
