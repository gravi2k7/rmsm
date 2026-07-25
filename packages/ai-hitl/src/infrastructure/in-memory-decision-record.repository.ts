import type { DecisionRecordRepository } from "../repositories/decision-record-repository.interface";
import type { DecisionRecord } from "../domain/entities/decision-record.entity";

export class InMemoryDecisionRecordRepository implements DecisionRecordRepository {
  private readonly items: DecisionRecord[] = [];

  async save(record: DecisionRecord): Promise<void> {
    this.items.push(record);
  }

  async listBySubject(subjectId: string): Promise<readonly DecisionRecord[]> {
    return this.items.filter((r) => r.subjectId === subjectId);
  }
}
