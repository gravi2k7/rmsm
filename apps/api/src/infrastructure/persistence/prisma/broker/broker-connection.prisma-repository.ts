import { Injectable } from "@nestjs/common";
import {
  BrokerConnectionStatus,
  type BrokerConnection,
  type DbClient,
  Prisma,
} from "@rmsm/database";
import { prisma } from "@rmsm/database";
import type {
  BrokerConnectionRepository,
  CreateBrokerConnectionInput,
} from "../../../../application/brokers/contracts/broker-connection.repository";

@Injectable()
export class BrokerConnectionPrismaRepository
  implements BrokerConnectionRepository
{
  constructor(private readonly prismaClient: DbClient = prisma) {}

  create(input: CreateBrokerConnectionInput): Promise<BrokerConnection> {
    return this.prismaClient.brokerConnection.create({
      data: {
        organizationId: input.organizationId,
        provider: input.provider,
        name: input.name,
        credentialsEnc: input.credentialsEnc,
      },
    });
  }

  listByOrganization(organizationId: string): Promise<BrokerConnection[]> {
    return this.prismaClient.brokerConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<BrokerConnection | null> {
    return this.prismaClient.brokerConnection.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  }

  updateStatus(
    organizationId: string,
    id: string,
    status: BrokerConnectionStatus,
    lastConnectionTestAt: Date,
    lastConnectionTestStatus: string,
  ): Promise<BrokerConnection> {
    return this.prismaClient.brokerConnection.update({
      where: { id },
      data: {
        status,
        lastConnectionTestAt,
        lastConnectionTestStatus,
      },
    }).then((connection) => {
      if (connection.organizationId !== organizationId) {
        throw new Error("Broker connection organization mismatch.");
      }

      return connection;
    });
  }
}
