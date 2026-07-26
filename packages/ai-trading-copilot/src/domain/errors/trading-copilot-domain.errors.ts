import { DomainError } from "@rmsm/core";

export class UnroutableQuestionError extends DomainError {
  constructor(question: string) {
    super(`No registered tool could answer: "${question}".`, "UNROUTABLE_QUESTION");
  }
}
