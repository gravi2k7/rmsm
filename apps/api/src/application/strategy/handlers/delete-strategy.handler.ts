import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { StrategyId, StrategyService } from "@rmsm/strategy";
import { DeleteStrategyCommand } from "../commands/delete-strategy.command";

@CommandHandler(DeleteStrategyCommand)
export class DeleteStrategyHandler implements ICommandHandler<DeleteStrategyCommand, void> {
  constructor(private readonly strategyService: StrategyService) {}

  async execute(command: DeleteStrategyCommand): Promise<void> {
    const idResult = StrategyId.create(command.strategyId);
    if (!idResult.ok) throw idResult.error;

    const result = await this.strategyService.transitionStatus(idResult.value, "ARCHIVED");
    if (!result.ok) throw result.error;
  }
}
