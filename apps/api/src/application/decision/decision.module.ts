import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DecisionService } from "@rmsm/decision";
import type { DecisionRepository } from "@rmsm/decision";
import { InMemoryDecisionRepository } from "../../infrastructure/persistence/memory/decision/decision.memory-repository";
import { DECISION_REPOSITORY } from "./decision.tokens";
import { DecisionController } from "./decision.controller";
import { DecisionMapper } from "./mappers/decision.mapper";
import { ListDecisionsHandler } from "./handlers/list-decisions.handler";
import { ApproveDecisionHandler, RejectDecisionHandler } from "./handlers/approve-reject-decision.handler";

@Module({
  imports: [CqrsModule],
  controllers: [DecisionController],
  providers: [
    { provide: DECISION_REPOSITORY, useClass: InMemoryDecisionRepository },
    {
      provide: DecisionService,
      useFactory: (repository: DecisionRepository) => new DecisionService(repository),
      inject: [DECISION_REPOSITORY],
    },
    DecisionMapper,
    ListDecisionsHandler,
    ApproveDecisionHandler,
    RejectDecisionHandler,
  ],
})
export class DecisionApplicationModule {}
