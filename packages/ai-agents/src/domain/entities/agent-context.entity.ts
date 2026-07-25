import type { AgentGoal } from "./agent-goal.entity";

/** The "Agent context" capability — everything one run of an agent
 * carries forward: its goals, a free-form variable bag a
 * `ReasoningStrategy` can read/write between steps, and (optionally) a
 * session id an integration layer like AI-403 can key memory off of.
 * Deliberately holds no direct reference to `@rmsm/ai-memory` —
 * `sessionId` is just a string, the seam AI-403 attaches real memory
 * to without this package depending on AI-203.
 */
export interface AgentContext {
  readonly agentId: string;
  readonly sessionId: string | null;
  readonly goals: readonly AgentGoal[];
  readonly variables: Readonly<Record<string, unknown>>;
}
