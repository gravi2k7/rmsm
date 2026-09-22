import { Injectable } from "@nestjs/common";
import { prisma, type BrokerInstrumentMapping, type DbClient } from "@rmsm/database";
import type {
  BrokerInstrumentMappingRepository,
  CreateBrokerInstrumentMappingInput,
} from "../../../../application/brokers/contracts/broker-instrument-mapping.repository";

@Injectable()
export class BrokerInstrumentMappingPrismaRepository
  implements BrokerInstrumentMappingRepository
{
  async create(
    input: CreateBrokerInstrumentMappingInput,
  ): Promise<BrokerInstrumentMapping> {
    return prisma.brokerInstrumentMapping.create({
      data: {
        brokerConnectionId: input.brokerConnectionId,
        instrumentId: input.instrumentId,
        brokerSymbol: input.brokerSymbol,
        brokerInstrumentId: input.brokerInstrumentId,
      },
    });
  }

  async listByConnection(
    brokerConnectionId: string,
  ): Promise<BrokerInstrumentMapping[]> {
    return prisma.brokerInstrumentMapping.findMany({
      where: { brokerConnectionId },
      orderBy: { createdAt: "asc" },
    });
  }

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

  async delete(
    brokerConnectionId: string,
    id: string,
  ): Promise<void> {
    await prisma.brokerInstrumentMapping.deleteMany({
      where: {
        id,
        brokerConnectionId,
      },
    });
  }
}
