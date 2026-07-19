import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { InMemoryExchangeRepository } from "../../infrastructure/persistence/memory/market/exchange.memory-repository";
import { InMemorySymbolRepository } from "../../infrastructure/persistence/memory/market/symbol.memory-repository";
import { InMemoryMarketRepository } from "../../infrastructure/persistence/memory/market/market.memory-repository";
import { MarketSeedService } from "../../infrastructure/persistence/memory/market/market.seed";
import { EXCHANGE_REPOSITORY, SYMBOL_REPOSITORY, MARKET_REPOSITORY } from "./market.tokens";
import { MarketController } from "./market.controller";
import { MarketMapper } from "./mappers/market.mapper";
import { ListExchangesHandler, GetExchangeByIdHandler, ListSymbolsHandler, ListCandlesHandler } from "./handlers/market.handlers";

const QUERY_HANDLERS = [ListExchangesHandler, GetExchangeByIdHandler, ListSymbolsHandler, ListCandlesHandler];

@Module({
  imports: [CqrsModule],
  controllers: [MarketController],
  providers: [
    InMemoryExchangeRepository,
    InMemorySymbolRepository,
    { provide: EXCHANGE_REPOSITORY, useExisting: InMemoryExchangeRepository },
    { provide: SYMBOL_REPOSITORY, useExisting: InMemorySymbolRepository },
    { provide: MARKET_REPOSITORY, useClass: InMemoryMarketRepository },
    // MarketSeedService needs the concrete InMemoryExchangeRepository/
    // InMemorySymbolRepository classes (its own `onModuleInit()` seeds
    // them directly) — registered separately from the interface tokens
    // above via `useExisting`, so both the seed service and every query
    // handler resolve to the exact same singleton instances.
    MarketSeedService,
    MarketMapper,
    ...QUERY_HANDLERS,
  ],
})
export class MarketApplicationModule {}
