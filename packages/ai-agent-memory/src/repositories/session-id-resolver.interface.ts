/** How an agent id maps to an `@rmsm/ai-memory` conversation/session
 * id — kept as its own small abstraction because different
 * deployments may want a 1:1 mapping (`IdentitySessionIdResolver`, the
 * default this package ships) or something richer (e.g. one shared
 * session across a multi-agent run, per AI-405's "shared memory"
 * capability, which supplies its own resolver). */
export interface SessionIdResolver {
  resolve(agentId: string, requestedSessionId: string | null): string;
}
