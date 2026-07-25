/** The "feedback" capability: a human's rating/comment on some subject
 * (an approval, an intervention, an agent run, ...) — deliberately
 * subject-type-agnostic (`subjectId` is any correlation id the caller
 * chooses) so this package doesn't need to know what kinds of things
 * feedback can be attached to. */
export interface Feedback {
  readonly id: string;
  readonly subjectId: string;
  readonly agentId: string;
  readonly submittedBy: string;
  readonly rating?: number;
  readonly comment?: string;
  readonly submittedAt: Date;
}
