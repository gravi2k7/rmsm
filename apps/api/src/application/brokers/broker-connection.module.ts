import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../../modules/organizations/organizations.module";
import {
  TRADING_ACCOUNT_REPOSITORY,
  BROKER_INSTRUMENT_MAPPING_REPOSITORY,
} from "../trading/trading.tokens";
import { PrismaTradingAccountRepository } from "../../infrastructure/persistence/prisma/trading/trading-account.prisma-repository";
import { BrokerConnectionController } from "./broker-connection.controller";
import { BrokerConnectionService } from "./broker-connection.service";
import { BrokerInstrumentMappingController } from "./broker-instrument-mapping.controller";
import { BrokerInstrumentMappingService } from "./broker-instrument-mapping.service";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";
import { BrokerConnectionPrismaRepository } from "../../infrastructure/persistence/prisma/broker/broker-connection.prisma-repository";
import { BROKER_CONNECTION_REPOSITORY } from "./broker-connection.tokens";
import { BrokerInstrumentMappingPrismaRepository } from "../../infrastructure/persistence/prisma/broker/broker-instrument-mapping.prisma-repository";
import { Mt5WorkerService } from "./mt5-worker.service";
import { Mt5WorkerPrismaRepository } from "../../infrastructure/persistence/prisma/broker/mt5-worker.prisma-repository";
import { MT5_WORKER_REPOSITORY } from "./mt5-worker.tokens";
import { Mt5WorkerAdminController } from "./mt5-worker-admin.controller";
import { Mt5WorkerInternalController } from "./mt5-worker-internal.controller";
import { Mt5WorkerAuthService } from "./mt5-worker-auth.service";
import { Mt5WorkerAuthGuard } from "./mt5-worker-auth.guard";

@Module({
  imports: [OrganizationsModule],
  controllers: [
    BrokerConnectionController,
    BrokerInstrumentMappingController,
    Mt5WorkerAdminController,
    Mt5WorkerInternalController,
  ],
  providers: [
    BrokerConnectionService,
    BrokerInstrumentMappingService,
    BrokerCredentialsEncryptionService,
    Mt5WorkerService,
    Mt5WorkerAuthService,
    Mt5WorkerAuthGuard,
    {
      provide: MT5_WORKER_REPOSITORY,
      useClass: Mt5WorkerPrismaRepository,
    },
    {
      provide: BROKER_CONNECTION_REPOSITORY,
      useClass: BrokerConnectionPrismaRepository,
    },
    {
      provide: TRADING_ACCOUNT_REPOSITORY,
      useClass: PrismaTradingAccountRepository,
    },
    {
      provide: BROKER_INSTRUMENT_MAPPING_REPOSITORY,
      useClass: BrokerInstrumentMappingPrismaRepository,
    },
  ],
  exports: [
    BrokerConnectionService,
    Mt5WorkerService,
    BROKER_INSTRUMENT_MAPPING_REPOSITORY,
  ],
})
export class BrokerConnectionModule {}
