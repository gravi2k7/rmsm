import { describe, expect, it } from "vitest";
import {
  DuplicateWorkerError,
  WorkerNotFoundError,
  NoEligibleWorkerError,
  DelegationNotFoundError,
} from "../errors/orchestration-domain.errors";

describe("orchestration domain errors", () => {
  it("carry stable error codes", () => {
    expect(new DuplicateWorkerError("w1").code).toBe("DUPLICATE_WORKER");
    expect(new WorkerNotFoundError("w1").code).toBe("WORKER_NOT_FOUND");
    expect(new NoEligibleWorkerError("research").code).toBe("NO_ELIGIBLE_WORKER");
    expect(new DelegationNotFoundError("d1").code).toBe("DELEGATION_NOT_FOUND");
  });
});
