import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { InMemoryExecutionRepository } from "../../infrastructure/persistence/memory/execution/execution.memory-repository";
import { EXECUTION_REPOSITORY } from "./execution.tokens";
import { ExecutionController } from "./execution.controller";
import { ExecutionMapper } from "./mappers/execution.mapper";
import { CreateOrderHandler } from "./handlers/create-order.handler";
import { ListOrdersHandler, ListExecutionsHandler } from "./handlers/list-orders-and-executions.handler";

@Module({
  imports: [CqrsModule],
  controllers: [ExecutionController],
  providers: [
    { provide: EXECUTION_REPOSITORY, useClass: InMemoryExecutionRepository },
    ExecutionMapper,
    CreateOrderHandler,
    ListOrdersHandler,
    ListExecutionsHandler,
  ],
})
export class ExecutionApplicationModule {}
