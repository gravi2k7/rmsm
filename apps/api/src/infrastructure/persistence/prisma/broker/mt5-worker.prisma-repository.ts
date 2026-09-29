import {
  prisma,
  type Mt5Worker,
  type Mt5WorkerStatus,
} from "@rmsm/database";

import type {
  CreateMt5WorkerInput,
  Mt5WorkerRepository,
} from "../../../../application/brokers/mt5-worker.repository";

export class Mt5WorkerPrismaRepository
  implements Mt5WorkerRepository
{
  async create(
    input: CreateMt5WorkerInput,
  ): Promise<Mt5Worker> {
    return prisma.mt5Worker.create({
      data: {
        workerKey: input.workerKey,
        name: input.name,
        gatewayUrl: input.gatewayUrl,
        authSecretHash: input.authSecretHash,
        gatewaySecretEnc: input.gatewaySecretEnc,
        status: "OFFLINE",
      },
    });
  }

  async findById(
    id: string,
  ): Promise<Mt5Worker | null> {
    return prisma.mt5Worker.findUnique({
      where: { id },
    });
  }

  async findByWorkerKey(
    workerKey: string,
  ): Promise<Mt5Worker | null> {
    return prisma.mt5Worker.findUnique({
      where: { workerKey },
    });
  }

  async listAll(): Promise<Mt5Worker[]> {
    return prisma.mt5Worker.findMany({
      orderBy: [
        { createdAt: "asc" },
      ],
    });
  }

  async listAvailable(
    heartbeatSince: Date,
  ): Promise<Mt5Worker[]> {
    return prisma.mt5Worker.findMany({
      where: {
        status: "ACTIVE",
        lastHeartbeatAt: {
          gte: heartbeatSince,
        },
        brokerConnection: {
          is: null,
        },
      },
      orderBy: [
        { lastHeartbeatAt: "desc" },
        { createdAt: "asc" },
      ],
    });
  }

  async updateSecrets(
    id: string,
    authSecretHash: string,
    gatewaySecretEnc: string,
  ): Promise<Mt5Worker> {
    return prisma.mt5Worker.update({
      where: { id },
      data: {
        authSecretHash,
        gatewaySecretEnc,
      },
    });
  }

  async heartbeat(
    workerKey: string,
    heartbeatAt: Date,
  ): Promise<Mt5Worker> {
    const worker = await prisma.mt5Worker.findUnique({
      where: { workerKey },
    });

    if (!worker) {
      throw new Error("MT5 worker not found");
    }

    return prisma.mt5Worker.update({
      where: { workerKey },
      data: {
        lastHeartbeatAt: heartbeatAt,
        lastError: null,
        status:
          worker.status === "DRAINING"
            ? "DRAINING"
            : "ACTIVE",
      },
    });
  }

  async setStatus(
    workerKey: string,
    status: Mt5WorkerStatus,
    lastError: string | null = null,
  ): Promise<Mt5Worker> {
    return prisma.mt5Worker.update({
      where: { workerKey },
      data: {
        status,
        lastError,
      },
    });
  }
}
