import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DecisionService } from "@rmsm/decision";
import { ApproveDecisionCommand, RejectDecisionCommand } from "../commands/decision.commands";
import { DecisionMapper } from "../mappers/decision.mapper";
import type { DecisionResponseDto } from "../dto/decision.dto";

@CommandHandler(ApproveDecisionCommand)
export class ApproveDecisionHandler implements ICommandHandler<ApproveDecisionCommand, DecisionResponseDto> {
  constructor(
    private readonly decisionService: DecisionService,
    private readonly mapper: DecisionMapper,
  ) {}

  async execute(command: ApproveDecisionCommand): Promise<DecisionResponseDto> {
    // DecisionService.approve() itself enforces that the decision's own
    // risk assessment actually passed before allowing this — see
    // @rmsm/decision's own doc comment on that method. This handler
    // doesn't duplicate that check; it's the domain's own job.
    const result = await this.decisionService.approve(command.decisionId, command.decidedBy, command.dto.comments);
    if (!result.ok) throw result.error;
    return this.mapper.toResponseDto(result.value);
  }
}

@CommandHandler(RejectDecisionCommand)
export class RejectDecisionHandler implements ICommandHandler<RejectDecisionCommand, DecisionResponseDto> {
  constructor(
    private readonly decisionService: DecisionService,
    private readonly mapper: DecisionMapper,
  ) {}

  async execute(command: RejectDecisionCommand): Promise<DecisionResponseDto> {
    const result = await this.decisionService.reject(command.decisionId, command.decidedBy, command.dto.comments);
    if (!result.ok) throw result.error;
    return this.mapper.toResponseDto(result.value);
  }
}
