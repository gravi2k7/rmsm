import { describe, expect, it } from "vitest";
import { EmptyExposureSetError } from "../errors/portfolio-intelligence-domain.errors";

describe("portfolio-intelligence domain errors", () => {
  it("EmptyExposureSetError carries the EMPTY_EXPOSURE_SET code", () => {
    expect(new EmptyExposureSetError().code).toBe("EMPTY_EXPOSURE_SET");
  });
});
