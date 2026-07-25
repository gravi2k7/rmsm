/** The "consensus abstraction" capability: a proposal put to a set of
 * voting agents, and the strategy-computed verdict. `ConsensusStrategy`
 * (a repository-layer port) is what's pluggable — this package ships
 * exactly one implementation, `MajorityConsensusStrategy`. */
export interface ConsensusProposal {
  readonly id: string;
  readonly proposerId: string;
  readonly description: string;
  readonly votes: Readonly<Record<string, boolean>>;
}

export interface ConsensusResult {
  readonly proposalId: string;
  readonly approved: boolean;
  readonly forCount: number;
  readonly againstCount: number;
}
