/** The "agent messaging" capability: a point-to-point message between
 * two agents (coordinator<->worker or worker<->worker), independent of
 * delegation — collaborating agents can exchange information this way
 * without it being framed as a task handoff. */
export interface AgentMessage {
  readonly id: string;
  readonly fromAgentId: string;
  readonly toAgentId: string;
  readonly content: unknown;
  readonly sentAt: Date;
}
