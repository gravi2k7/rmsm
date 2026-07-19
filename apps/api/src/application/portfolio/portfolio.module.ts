import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { InMemoryPortfolioRepository } from "../../infrastructure/persistence/memory/portfolio/portfolio.memory-repository";
import { PortfolioSeedService } from "../../infrastructure/persistence/memory/portfolio/portfolio.seed";
import { PORTFOLIO_REPOSITORY } from "./portfolio.tokens";
import { PortfolioController } from "./portfolio.controller";
import { PortfolioMapper } from "./mappers/portfolio.mapper";
import { GetPortfolioHandler, ListPositionsHandler, ListTradesHandler } from "./handlers/portfolio.handlers";

@Module({
  imports: [CqrsModule],
  controllers: [PortfolioController],
  providers: [
    InMemoryPortfolioRepository,
    { provide: PORTFOLIO_REPOSITORY, useExisting: InMemoryPortfolioRepository },
    PortfolioSeedService,
    PortfolioMapper,
    GetPortfolioHandler,
    ListPositionsHandler,
    ListTradesHandler,
  ],
})
export class PortfolioApplicationModule {}
