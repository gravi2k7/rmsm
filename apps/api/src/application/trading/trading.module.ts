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
import { BrokerExecutionService } from "./broker-execution.service";
import { BrokerConnectionModule } from "../brokers/broker-connection.module";
import { BrokerSyncService } from "../brokers/sync/broker-sync.service";
import { BrokerSyncQueueProcessor } from "../brokers/sync/broker-sync.queue.processor";
import { BrokerSyncCronRegistrar } from "../brokers/sync/broker-sync.cron.registrar";
import { CopyEngineService } from "../copy-engine/copy-engine.service";
import { BullModule } from "@nestjs/bullmq";
import { CopyExecutionRecoveryService } from "../copy-engine/recovery/copy-execution-recovery.service";
import { CopyExecutionRecoveryQueueProcessor } from "../copy-engine/recovery/copy-execution-recovery.queue.processor";
import { CopyExecutionRecoveryCronRegistrar } from "../copy-engine/recovery/copy-execution-recovery.cron.registrar";
import { COPY_EXECUTION_RECOVERY_REPOSITORY } from "../copy-engine/recovery/copy-execution-recovery.tokens";
import { PrismaCopyExecutionRecoveryRepository } from "../../infrastructure/persistence/prisma/copy-engine/copy-execution-recovery.prisma-repository";
import { CopyGroupController } from "../copy-engine/management/copy-group.controller";
import { CopyGroupService } from "../copy-engine/management/copy-group.service";
import { COPY_GROUP_REPOSITORY } from "../copy-engine/management/copy-group.tokens";
import { PrismaCopyGroupRepository } from "../../infrastructure/persistence/prisma/copy-engine/copy-group.prisma-repository";


@Module({
  imports: [
    MarketDataModule,
    BrokerConnectionModule,
    BullModule.registerQueue({
      name: "copy-execution-recovery",
    }),
    BullModule.registerQueue({
      name: "broker-account-sync",
    }),
  ],
  controllers: [TradingController, CopyGroupController],
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
    {
      provide: COPY_EXECUTION_RECOVERY_REPOSITORY,
      useClass: PrismaCopyExecutionRecoveryRepository,
    },
    {
      provide: COPY_GROUP_REPOSITORY,
      useClass: PrismaCopyGroupRepository,
    },
    TradingAccountService,
    PaperTradingService,
    PaperTradingRiskMonitorService,
    BrokerExecutionService,
    BrokerSyncService,
    BrokerSyncQueueProcessor,
    BrokerSyncCronRegistrar,
    CopyEngineService,
    CopyGroupService,
    CopyExecutionRecoveryService,
    CopyExecutionRecoveryQueueProcessor,
    CopyExecutionRecoveryCronRegistrar,
  ],
  exports: [
    TradingAccountService,
    PaperTradingService,
    BrokerExecutionService,
    BrokerSyncService,
    PAPER_TRADING_REPOSITORY,
  ],
})
export class TradingApplicationModule {}
