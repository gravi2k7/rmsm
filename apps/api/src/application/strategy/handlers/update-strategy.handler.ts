import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { StrategyId, StrategyService } from "@rmsm/strategy";
import { UpdateStrategyCommand } from "../commands/update-strategy.command";
import { STRATEGY_REPOSITORY } from "../strategy.tokens";
import type { StrategyRepository } from "@rmsm/strategy";
import { StrategyMapper } from "../mappers/strategy.mapper";
import type { StrategyResponseDto } from "../dto/strategy-response.dto";

/**
 * Applies at most two independent changes — a lifecycle transition
 * (`status`) and an enable/disable toggle (`enabled`) — sequentially,
 * via `StrategyService`'s own dedicated methods for each, rather than a
 * single combined "update" call the domain service doesn't offer (nor
 * should it: transitioning status and toggling enabled are two genuinely
 * separate domain operations, each with its own validation and its own
 * event).
 */
@CommandHandler(UpdateStrategyCommand)
export class UpdateStrategyHandler implements ICommandHandler<UpdateStrategyCommand, StrategyResponseDto> {
  constructor(
    @Inject(STRATEGY_REPOSITORY) private readonly strategyRepository: StrategyRepository,
    private readonly strategyService: StrategyService,
    private readonly mapper: StrategyMapper,
  ) {}

  async execute(command: UpdateStrategyCommand): Promise<StrategyResponseDto> {
    const idResult = StrategyId.create(command.strategyId);
    if (!idResult.ok) throw idResult.error;

    if (command.dto.status) {
      const result = await this.strategyService.transitionStatus(idResult.value, command.dto.status);
      if (!result.ok) throw result.error;
    }

    if (command.dto.enabled !== undefined) {
      const result = await this.strategyService.setEnabled(idResult.value, command.dto.enabled);
      if (!result.ok) throw result.error;
    }

    const strategy = await this.strategyRepository.findById(idResult.value);
    if (!strategy) throw new Error(`Strategy ${command.strategyId} disappeared mid-update — this should be unreachable.`);

    return this.mapper.toResponseDto(strategy);
  }
}
