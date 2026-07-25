import { describe, expect, it } from "vitest";
import {
  EmptyGoalError,
  UnknownDependencyError,
  CyclicDependencyError,
  PlanNotFoundError,
  TaskNotFoundError,
  InvalidPlanError,
} from "../errors/planning-domain.errors";

describe("planning domain errors", () => {
  it("EmptyGoalError carries a stable code", () => {
    expect(new EmptyGoalError().code).toBe("EMPTY_GOAL");
  });

  it("UnknownDependencyError names both task and dependency", () => {
    const error = new UnknownDependencyError("t1", "ghost");
    expect(error.code).toBe("UNKNOWN_DEPENDENCY");
    expect(error.message).toContain("t1");
    expect(error.message).toContain("ghost");
  });

  it("CyclicDependencyError includes the cycle", () => {
    const error = new CyclicDependencyError(["a", "b", "a"]);
    expect(error.code).toBe("CYCLIC_DEPENDENCY");
    expect(error.message).toContain("a -> b -> a");
  });

  it("PlanNotFoundError and TaskNotFoundError carry stable codes", () => {
    expect(new PlanNotFoundError("p1").code).toBe("PLAN_NOT_FOUND");
    expect(new TaskNotFoundError("p1", "t1").code).toBe("TASK_NOT_FOUND");
  });

  it("InvalidPlanError joins reasons", () => {
    const error = new InvalidPlanError(["reason one", "reason two"]);
    expect(error.message).toContain("reason one");
    expect(error.message).toContain("reason two");
  });
});
