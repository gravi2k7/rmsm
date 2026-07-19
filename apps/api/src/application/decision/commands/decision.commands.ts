import type { ApproveDecisionDto, RejectDecisionDto } from "../dto/decision.dto";

export class ApproveDecisionCommand {
  constructor(
    public readonly decisionId: string,
    public readonly decidedBy: string,
    public readonly dto: ApproveDecisionDto,
  ) {}
}

export class RejectDecisionCommand {
  constructor(
    public readonly decisionId: string,
    public readonly decidedBy: string,
    public readonly dto: RejectDecisionDto,
  ) {}
}
