import { Injectable } from "@nestjs/common";
import {
  BrokerConnectionStatus,
  type BrokerConnection,
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
  create(input: CreateBrokerConnectionInput): Promise<BrokerConnection> {
    return prisma.brokerConnection.create({
      data: {
        organizationId: input.organizationId,
        provider: input.provider,
        name: input.name,
        credentialsEnc: input.credentialsEnc,
        ...(input.mt5WorkerId !== undefined
          ? { mt5WorkerId: input.mt5WorkerId }
          : {}),
      },
    });
  }

  listByOrganization(organizationId: string): Promise<BrokerConnection[]> {
    return prisma.brokerConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<BrokerConnection | null> {
    return prisma.brokerConnection.findFirst({
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
    return prisma.brokerConnection.update({
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

  async tryAssignMt5Worker(
    organizationId: string,
    id: string,
    workerId: string,
  ): Promise<{
    connection: BrokerConnection;
    assigned: boolean;
  } | null> {
    try {
      const result = await prisma.brokerConnection.updateMany({
        where: {
          id,
          organizationId,
          mt5WorkerId: null,
        },
        data: {
          mt5WorkerId: workerId,
        },
      });

      const connection = await prisma.brokerConnection.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!connection) {
        throw new Error("Broker connection not found.");
      }

      if (result.count === 1) {
        return {
          connection,
          assigned: true,
        };
      }

      return {
        connection,
        assigned: false,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return null;
      }

      throw error;
    }
  }

  async releaseMt5Worker(
    organizationId: string,
    id: string,
    workerId: string,
  ): Promise<BrokerConnection> {
    await prisma.brokerConnection.updateMany({
      where: {
        id,
        organizationId,
        mt5WorkerId: workerId,
      },
      data: {
        mt5WorkerId: null,
      },
    });

    const connection = await prisma.brokerConnection.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!connection) {
      throw new Error("Broker connection not found.");
    }

    return connection;
  }
}
