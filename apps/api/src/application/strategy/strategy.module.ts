import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { StrategyService, StrategyValidatorService } from "@rmsm/strategy";
import type { StrategyRepository } from "@rmsm/strategy";
import { InMemoryStrategyRepository } from "../../infrastructure/persistence/memory/strategy/strategy.memory-repository";
import { STRATEGY_REPOSITORY } from "./strategy.tokens";
import { StrategyController } from "./strategy.controller";
import { StrategyMapper } from "./mappers/strategy.mapper";
import { CreateStrategyHandler } from "./handlers/create-strategy.handler";
import { UpdateStrategyHandler } from "./handlers/update-strategy.handler";
import { DeleteStrategyHandler } from "./handlers/delete-strategy.handler";
import { ListStrategiesHandler, GetStrategyByIdHandler } from "./handlers/list-and-get-strategy.handler";

const COMMAND_AND_QUERY_HANDLERS = [CreateStrategyHandler, UpdateStrategyHandler, DeleteStrategyHandler, ListStrategiesHandler, GetStrategyByIdHandler];

/**
 * `StrategyService`/`StrategyValidatorService` (plain domain classes from
 * `@rmsm/strategy`, with no NestJS decorators of their own — the domain
 * package has no dependency on NestJS at all) are registered via
 * `useFactory`, not a bare class reference: NestJS's automatic
 * constructor-injection resolves providers by reflecting on parameter
 * *types*, which doesn't work for `StrategyRepository` (an interface,
 * erased at runtime) — the factory below is what actually supplies the
 * concrete, token-resolved repository these services need.
 */
@Module({
  imports: [CqrsModule],
  controllers: [StrategyController],
  providers: [
    { provide: STRATEGY_REPOSITORY, useClass: InMemoryStrategyRepository },
    {
      provide: StrategyService,
      useFactory: (repository: StrategyRepository) => new StrategyService(repository, new StrategyValidatorService()),
      inject: [STRATEGY_REPOSITORY],
    },
    StrategyMapper,
    ...COMMAND_AND_QUERY_HANDLERS,
  ],
})
export class StrategyApplicationModule {}
