import { describe, it, expect } from "vitest";
import {
  StepHandlerNotFoundError,
  CyclicWorkflowError,
  UnknownStepDependencyError,
  StepTimeoutError,
  WorkflowExecutionNotFoundError,
} from "../errors/workflow-domain.errors";

describe("workflow domain errors", () => {
  it("StepHandlerNotFoundError carries a stable code", () => {
    expect(new StepHandlerNotFoundError("h1").code).toBe("STEP_HANDLER_NOT_FOUND");
  });
  it("CyclicWorkflowError carries a stable code", () => {
    expect(new CyclicWorkflowError("wf1").code).toBe("CYCLIC_WORKFLOW");
  });
  it("UnknownStepDependencyError carries a stable code", () => {
    expect(new UnknownStepDependencyError("s1", "s2").code).toBe("UNKNOWN_STEP_DEPENDENCY");
  });
  it("StepTimeoutError carries a stable code", () => {
    expect(new StepTimeoutError("s1", 1000).code).toBe("STEP_TIMEOUT");
  });
  it("WorkflowExecutionNotFoundError carries a stable code", () => {
    expect(new WorkflowExecutionNotFoundError("e1").code).toBe("WORKFLOW_EXECUTION_NOT_FOUND");
  });
});
