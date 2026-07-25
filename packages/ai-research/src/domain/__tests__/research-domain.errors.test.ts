import { describe, it, expect } from "vitest";
import { ResearchPlanNotFoundError, NoEvidenceFoundError, InvalidResearchQueryError } from "../errors/research-domain.errors";

describe("research domain errors", () => {
  it("ResearchPlanNotFoundError carries a stable code", () => {
    expect(new ResearchPlanNotFoundError("p1").code).toBe("RESEARCH_PLAN_NOT_FOUND");
  });
  it("NoEvidenceFoundError carries a stable code", () => {
    expect(new NoEvidenceFoundError("step1").code).toBe("NO_EVIDENCE_FOUND");
  });
  it("InvalidResearchQueryError carries a stable code", () => {
    expect(new InvalidResearchQueryError("empty").code).toBe("INVALID_RESEARCH_QUERY");
  });
});
