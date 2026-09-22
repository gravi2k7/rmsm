import { Injectable } from "@nestjs/common";
import {
  prisma,
  type BrokerInstrumentMapping,
} from "@rmsm/database";
import type { BrokerInstrumentMappingRepository } from "../../../../application/brokers/contracts/broker-instrument-mapping.repository";

@Injectable()
export class BrokerInstrumentMappingPrismaRepository
  implements BrokerInstrumentMappingRepository
{
  async findByConnectionAndInstrument(
    brokerConnectionId: string,
    instrumentId: string,
  ): Promise<BrokerInstrumentMapping | null> {
    return prisma.brokerInstrumentMapping.findFirst({
      where: {
        brokerConnectionId,
        instrumentId,
      },
    });
  }

  async findByConnectionAndBrokerInstrument(
    brokerConnectionId: string,
    brokerInstrumentId: string,
  ): Promise<BrokerInstrumentMapping | null> {
    return prisma.brokerInstrumentMapping.findFirst({
      where: {
        brokerConnectionId,
        brokerInstrumentId,
      },
    });
  }
}
