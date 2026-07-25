/**
 * The "secrets abstraction" capability — deliberately abstraction
 * only, ZERO implementations, exactly like `@rmsm/ai-tools`'
 * `McpToolSource` and `@rmsm/ai-agent-workflows`' `WorkflowScheduler`.
 * This codebase never touches a real secret store; a future adapter
 * (Vault, AWS Secrets Manager, `packages/database`-backed, ...)
 * implements this without any change to `SecretsService`.
 */
export interface SecretsProvider {
  getSecret(name: string): Promise<string | null>;
}
