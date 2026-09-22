import { Module } from "@nestjs/common";
import { TRADING_ACCOUNT_REPOSITORY } from "../trading/trading.tokens";
import { PrismaTradingAccountRepository } from "../../infrastructure/persistence/prisma/trading/trading-account.prisma-repository";
import { BrokerConnectionController } from "./broker-connection.controller";
import { BrokerConnectionService } from "./broker-connection.service";
import { BrokerInstrumentMappingController } from "./broker-instrument-mapping.controller";
import { BrokerInstrumentMappingService } from "./broker-instrument-mapping.service";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";
import { BrokerConnectionPrismaRepository } from "../../infrastructure/persistence/prisma/broker/broker-connection.prisma-repository";
import { BROKER_CONNECTION_REPOSITORY } from "./broker-connection.tokens";

@Module({
  imports: [],
  controllers: [BrokerConnectionController, BrokerInstrumentMappingController],
  providers: [
    BrokerConnectionService,
    BrokerInstrumentMappingService,
    BrokerCredentialsEncryptionService,
    {
      provide: BROKER_CONNECTION_REPOSITORY,
      useClass: BrokerConnectionPrismaRepository,
    },
    {
      provide: TRADING_ACCOUNT_REPOSITORY,
      useClass: PrismaTradingAccountRepository,
    },
  ],
  exports: [BrokerConnectionService],
})
export class BrokerConnectionModule {}
