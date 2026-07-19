import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { InMemoryOpportunityRepository } from "../../infrastructure/persistence/memory/opportunity/opportunity.memory-repository";
import { OPPORTUNITY_REPOSITORY } from "./opportunity.tokens";
import { OpportunityController } from "./opportunity.controller";
import { OpportunityMapper } from "./mappers/opportunity.mapper";
import { ListOpportunitiesHandler } from "./handlers/list-opportunities.handler";

@Module({
  imports: [CqrsModule],
  controllers: [OpportunityController],
  providers: [
    { provide: OPPORTUNITY_REPOSITORY, useClass: InMemoryOpportunityRepository },
    OpportunityMapper,
    ListOpportunitiesHandler,
  ],
})
export class OpportunityApplicationModule {}
