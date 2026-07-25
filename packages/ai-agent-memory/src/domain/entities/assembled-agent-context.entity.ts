/** The output of `AgentMemoryService.assembleContext()` — ready to
 * merge into an AI-401 `AgentContext.variables` (e.g. under a
 * `"memoryContext"` key) so a `ReasoningStrategy` can read it like any
 * other context variable, with no `@rmsm/ai-memory` type ever leaking
 * into `@rmsm/ai-agents` itself. */
export interface AssembledAgentContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly contextText: string;
  readonly sourceEntryIds: readonly string[];
  readonly truncated: boolean;
}
