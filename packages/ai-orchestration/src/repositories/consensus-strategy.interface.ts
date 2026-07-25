import type { ConsensusProposal, ConsensusResult } from "../domain/entities/consensus.entity";

export interface ConsensusStrategy {
  evaluate(proposal: ConsensusProposal): ConsensusResult;
}
