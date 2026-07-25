import { describe, it, expect } from "vitest";
import {
  ToolNotFoundError,
  ToolAlreadyRegisteredError,
  ToolParameterValidationError,
  ToolPermissionDeniedError,
  ToolTimeoutError,
} from "../errors/tool-domain.errors";

describe("tool domain errors", () => {
  it("ToolNotFoundError carries a stable code", () => {
    expect(new ToolNotFoundError("t1").code).toBe("TOOL_NOT_FOUND");
  });
  it("ToolAlreadyRegisteredError carries a stable code", () => {
    expect(new ToolAlreadyRegisteredError("t1").code).toBe("TOOL_ALREADY_REGISTERED");
  });
  it("ToolParameterValidationError carries a stable code", () => {
    expect(new ToolParameterValidationError("t1", ["bad"]).code).toBe("TOOL_PARAMETER_VALIDATION_FAILED");
  });
  it("ToolPermissionDeniedError carries a stable code", () => {
    expect(new ToolPermissionDeniedError("t1", ["admin"]).code).toBe("TOOL_PERMISSION_DENIED");
  });
  it("ToolTimeoutError carries a stable code", () => {
    expect(new ToolTimeoutError("t1", 1000).code).toBe("TOOL_TIMEOUT");
  });
});
