export interface ToolInvocation {
  readonly id: string;
  readonly toolName: string;
  readonly arguments: unknown;
  readonly grantedPermissions: readonly string[];
}
