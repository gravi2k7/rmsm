import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { StrategyFactory } from "@rmsm/strategy";
import { CreateStrategyCommand } from "../commands/create-strategy.command";
import { STRATEGY_REPOSITORY } from "../strategy.tokens";
import type { StrategyRepository } from "@rmsm/strategy";
import { StrategyMapper } from "../mappers/strategy.mapper";
import type { StrategyResponseDto } from "../dto/strategy-response.dto";

@CommandHandler(CreateStrategyCommand)
export class CreateStrategyHandler implements ICommandHandler<CreateStrategyCommand, StrategyResponseDto> {
  constructor(
    @Inject(STRATEGY_REPOSITORY) private readonly strategyRepository: StrategyRepository,
    private readonly mapper: StrategyMapper,
  ) {}

  async execute(command: CreateStrategyCommand): Promise<StrategyResponseDto> {
    const { dto } = command;

    const result = StrategyFactory.create({
      name: dto.name,
      description: dto.description,
      riskTolerance: dto.riskTolerance,
      maxRiskPerTrade: dto.maxRiskPerTrade,
      maxLeverage: dto.maxLeverage,
      maxOpenPositions: dto.maxOpenPositions,
      timeframe: dto.timeframe,
      supportedSymbols: dto.supportedSymbols,
    });

    // Not `Result`-returned up the CQRS chain — `StrategyFactory`'s own
    // `DomainError` is thrown directly, and the application-layer
    // `GlobalExceptionFilter` (extended in Phase 4A specifically for
    // this) already knows how to turn any `DomainError` into the right
    // HTTP status. A handler re-wrapping it in its own error type would
    // just be relabeling the same information.
    if (!result.ok) throw result.error;

    await this.strategyRepository.save(result.value);
    return this.mapper.toResponseDto(result.value);
  }
}
