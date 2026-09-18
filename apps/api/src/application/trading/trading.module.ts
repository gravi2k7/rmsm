import { Module } from "@nestjs/common";
import { prisma, TransactionManager } from "@rmsm/database";
import { MarketDataModule } from "../../modules/market-data/market-data.module";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { TradingController } from "./trading.controller";
import { TradingAccountService } from "./trading.service";
import { PaperTradingService } from "./paper-trading.service";
import { TRADING_ACCOUNT_REPOSITORY } from "./trading.tokens";
import { PrismaTradingAccountRepository } from "../../infrastructure/persistence/prisma/trading/trading-account.prisma-repository";
import { PrismaPaperTradingRepository } from "../../infrastructure/persistence/prisma/trading/paper-trading.prisma-repository";
import { PAPER_TRADING_REPOSITORY } from "./trading.tokens";
import { PaperTradingRiskMonitorService } from "./paper-trading-risk-monitor.service";

@Module({
  imports: [MarketDataModule],
  controllers: [TradingController],
  providers: [
    PermissionsGuard,
    {
      provide: TRADING_ACCOUNT_REPOSITORY,
      useClass: PrismaTradingAccountRepository,
    },
    {
      provide: PAPER_TRADING_REPOSITORY,
      useClass: PrismaPaperTradingRepository,
    },
    {
      provide: TransactionManager,
      useFactory: () => new TransactionManager(prisma),
    },
    TradingAccountService,
    PaperTradingService,
    PaperTradingRiskMonitorService,
  ],
  exports: [TradingAccountService, PaperTradingService, PAPER_TRADING_REPOSITORY],
})
export class TradingApplicationModule {}
