/** The "decision recording" capability: an immutable audit entry
 * written every time a human resolves an `ApprovalRequest` or
 * `ManualIntervention` — the record of WHO decided WHAT and WHY,
 * independent of the mutable current state of the thing decided. */
export interface DecisionRecord {
  readonly id: string;
  readonly subjectType: "APPROVAL" | "INTERVENTION";
  readonly subjectId: string;
  readonly decision: string;
  readonly decidedBy: string;
  readonly reason?: string;
  readonly decidedAt: Date;
}
