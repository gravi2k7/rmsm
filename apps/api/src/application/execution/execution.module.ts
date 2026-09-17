import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MarketDataModule } from "../../modules/market-data/market-data.module";
import { InMemoryExecutionRepository } from "../../infrastructure/persistence/memory/execution/execution.memory-repository";
import { DemoBroker } from "../../infrastructure/execution/demo/demo.broker";
import { EXECUTION_REPOSITORY } from "./execution.tokens";
import { ExecutionController } from "./execution.controller";
import { ExecutionMapper } from "./mappers/execution.mapper";
import {
  CreateOrderHandler,
} from "./handlers/create-order.handler";
import {
  ListOrdersHandler,
  ListExecutionsHandler,
} from "./handlers/list-orders-and-executions.handler";
import { ExecutionService } from "@rmsm/execution";
import {
  DEMO_BROKER,
  DemoOrderExecutionService,
} from "./services/demo-order-execution.service";
import type {
  Broker,
  ExecutionRepository,
} from "@rmsm/execution";

@Module({
  imports: [
    CqrsModule,
    MarketDataModule,
  ],
  controllers: [
    ExecutionController,
  ],
  providers: [
    {
      provide: EXECUTION_REPOSITORY,
      useClass: InMemoryExecutionRepository,
    },
    {
      provide: DEMO_BROKER,
      useClass: DemoBroker,
    },
    {
      provide: ExecutionService,
      useFactory: (
        repository: ExecutionRepository,
        broker: Broker,
      ) => new ExecutionService(repository, broker),
      inject: [
        EXECUTION_REPOSITORY,
        DEMO_BROKER,
      ],
    },
    ExecutionMapper,
    DemoOrderExecutionService,
    CreateOrderHandler,
    ListOrdersHandler,
    ListExecutionsHandler,
  ],
})
export class ExecutionApplicationModule {}
