import { describe, expect, it } from "vitest";
import { NoRecommendationsSuppliedError } from "../errors/executive-dashboard-domain.errors";

describe("executive-dashboard domain errors", () => {
  it("NoRecommendationsSuppliedError carries the NO_RECOMMENDATIONS_SUPPLIED code", () => {
    expect(new NoRecommendationsSuppliedError().code).toBe("NO_RECOMMENDATIONS_SUPPLIED");
  });
});
