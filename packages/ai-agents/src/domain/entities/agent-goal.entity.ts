export interface AgentGoal {
  readonly id: string;
  readonly description: string;
  readonly successCriteria?: string;
}
