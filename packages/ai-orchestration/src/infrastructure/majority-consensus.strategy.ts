import type { ConsensusStrategy } from "../repositories/consensus-strategy.interface";
import type { ConsensusProposal, ConsensusResult } from "../domain/entities/consensus.entity";

/** The one real `ConsensusStrategy`: approved if strictly more voters
 * voted for than against. Ties are NOT approved (conservative default —
 * a proposal needs a genuine majority, not just a plurality). */
export class MajorityConsensusStrategy implements ConsensusStrategy {
  evaluate(proposal: ConsensusProposal): ConsensusResult {
    const votes = Object.values(proposal.votes);
    const forCount = votes.filter((vote) => vote).length;
    const againstCount = votes.length - forCount;
    return { proposalId: proposal.id, approved: forCount > againstCount, forCount, againstCount };
  }
}
