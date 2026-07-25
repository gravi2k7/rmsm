import type { DecisionRecord } from "../domain/entities/decision-record.entity";

export interface DecisionRecordRepository {
  save(record: DecisionRecord): Promise<void>;
  listBySubject(subjectId: string): Promise<readonly DecisionRecord[]>;
}
