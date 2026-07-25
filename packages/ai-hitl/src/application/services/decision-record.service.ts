import type { DecisionRecordRepository } from "../../repositories/decision-record-repository.interface";
import type { DecisionRecord } from "../../domain/entities/decision-record.entity";

/** The query side of "decision recording" — `ApprovalService` and
 * `InterventionService` are the only writers (every resolution they
 * process records one entry); this service just reads the trail back
 * for a given subject. */
export class DecisionRecordService {
  constructor(private readonly decisionRepository: DecisionRecordRepository) {}

  async listForSubject(subjectId: string): Promise<readonly DecisionRecord[]> {
    return this.decisionRepository.listBySubject(subjectId);
  }
}
