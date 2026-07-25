import { describe, expect, it } from "vitest";
import {
  ApprovalRequestNotFoundError,
  ApprovalAlreadyResolvedError,
  InterventionNotFoundError,
  InterventionAlreadyResolvedError,
} from "../errors/hitl-domain.errors";

describe("hitl domain errors", () => {
  it("carry stable error codes", () => {
    expect(new ApprovalRequestNotFoundError("r1").code).toBe("APPROVAL_REQUEST_NOT_FOUND");
    expect(new ApprovalAlreadyResolvedError("r1", "APPROVED").code).toBe("APPROVAL_ALREADY_RESOLVED");
    expect(new InterventionNotFoundError("i1").code).toBe("INTERVENTION_NOT_FOUND");
    expect(new InterventionAlreadyResolvedError("i1").code).toBe("INTERVENTION_ALREADY_RESOLVED");
  });
});
