export enum ToolResultStatus {
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  TIMED_OUT = "timed_out",
  PERMISSION_DENIED = "permission_denied",
  INVALID_PARAMETERS = "invalid_parameters",
}

export const TOOL_RESULT_STATUSES = Object.values(ToolResultStatus) as readonly ToolResultStatus[];
