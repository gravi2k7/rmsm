import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  Mt5Worker,
  Mt5WorkerStatus,
} from "@rmsm/database";

import {
  MT5_WORKER_REPOSITORY,
} from "./mt5-worker.tokens";
import type {
  CreateMt5WorkerInput,
  Mt5WorkerRepository,
} from "./mt5-worker.repository";
import {
  generateMt5WorkerSecret,
  hashMt5WorkerSecret,
} from "./mt5-worker-secret";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";

const DEFAULT_HEARTBEAT_TIMEOUT_SECONDS = 90;

export type PublicMt5Worker =
  Omit<Mt5Worker, "authSecretHash" | "gatewaySecretEnc">;

@Injectable()
export class Mt5WorkerService {
  constructor(
    @Inject(MT5_WORKER_REPOSITORY)
    private readonly repository: Mt5WorkerRepository,
    private readonly encryption: BrokerCredentialsEncryptionService,
  ) {}

  async provisionWorker(
    input: Omit<CreateMt5WorkerInput, "authSecretHash" | "gatewaySecretEnc">,
  ): Promise<{
    worker: PublicMt5Worker;
    secret: string;
  }> {
    const workerKey = input.workerKey.trim();
    const name = input.name.trim();
    const gatewayUrl = input.gatewayUrl.trim();

    if (!workerKey) {
      throw new BadRequestException(
        "MT5 worker key is required.",
      );
    }

    if (!name) {
      throw new BadRequestException(
        "MT5 worker name is required.",
      );
    }

    if (!gatewayUrl) {
      throw new BadRequestException(
        "MT5 worker gateway URL is required.",
      );
    }

    const existing =
      await this.repository.findByWorkerKey(workerKey);

    if (existing) {
      throw new ConflictException(
        "MT5 worker key already exists.",
      );
    }

    const secret = generateMt5WorkerSecret();

    const worker = await this.repository.create({
      workerKey,
      name,
      gatewayUrl,
      authSecretHash:
        hashMt5WorkerSecret(secret),
      gatewaySecretEnc:
        this.encryption.encrypt({ secret }),
    });

    return {
      worker: this.toPublic(worker),
      secret,
    };
  }

  async listWorkers(): Promise<PublicMt5Worker[]> {
    const workers = await this.repository.listAll();
    return workers.map((worker) =>
      this.toPublic(worker),
    );
  }

  async rotateSecret(
    workerId: string,
  ): Promise<{
    worker: PublicMt5Worker;
    secret: string;
  }> {
    const worker = await this.repository.findById(workerId);

    if (!worker) {
      throw new NotFoundException(
        "MT5 worker not found.",
      );
    }

    const secret = generateMt5WorkerSecret();

    const updated =
      await this.repository.updateSecrets(
        workerId,
        hashMt5WorkerSecret(secret),
        this.encryption.encrypt({ secret }),
      );

    return {
      worker: this.toPublic(updated),
      secret,
    };
  }

  async getAvailableWorker(
    now = new Date(),
  ): Promise<Mt5Worker> {
    const workers =
      await this.getAvailableWorkers(now);

    const worker = workers[0];

    if (!worker) {
      throw new ServiceUnavailableException(
        "No available MT5 worker is online.",
      );
    }

    return worker;
  }

  async getExecutionWorker(
    workerId: string,
    now = new Date(),
  ): Promise<Mt5Worker> {
    const worker =
      await this.repository.findById(workerId);

    if (!worker) {
      throw new NotFoundException(
        "Assigned MT5 worker not found.",
      );
    }

    const heartbeatExpired =
      !worker.lastHeartbeatAt ||
      now.getTime() -
        worker.lastHeartbeatAt.getTime() >
        DEFAULT_HEARTBEAT_TIMEOUT_SECONDS * 1000;

    if (
      worker.status !== "ACTIVE" ||
      heartbeatExpired
    ) {
      throw new ServiceUnavailableException(
        "Assigned MT5 worker is not available.",
      );
    }

    return worker;
  }

  async getExecutionWorkerCredentials(
    workerId: string,
    now = new Date(),
  ): Promise<{
    worker: Mt5Worker;
    gatewaySecret: string;
  }> {
    const worker = await this.getExecutionWorker(workerId, now);

    if (!worker.gatewaySecretEnc) {
      throw new ServiceUnavailableException(
        "Assigned MT5 worker has no Gateway secret configured.",
      );
    }

    let payload: { secret?: unknown };

    try {
      payload = this.encryption.decrypt<{ secret?: unknown }>(
        worker.gatewaySecretEnc,
      );
    } catch {
      throw new ServiceUnavailableException(
        "Assigned MT5 worker Gateway secret could not be decrypted.",
      );
    }

    if (
      typeof payload.secret !== "string" ||
      !payload.secret
    ) {
      throw new ServiceUnavailableException(
        "Assigned MT5 worker Gateway secret is invalid.",
      );
    }

    return {
      worker,
      gatewaySecret: payload.secret,
    };
  }

  async heartbeat(
    workerKey: string,
    heartbeatAt = new Date(),
  ): Promise<PublicMt5Worker> {
    const worker =
      await this.repository.findByWorkerKey(workerKey);

    if (!worker) {
      throw new NotFoundException(
        "MT5 worker not found.",
      );
    }

    if (worker.status === "DISABLED") {
      throw new BadRequestException(
        "Disabled MT5 worker cannot report heartbeat.",
      );
    }

    return this.toPublic(
      await this.repository.heartbeat(
        workerKey,
        heartbeatAt,
      ),
    );
  }

  async setStatus(
    workerKey: string,
    status: Mt5WorkerStatus,
    lastError?: string | null,
  ): Promise<PublicMt5Worker> {
    const worker =
      await this.repository.findByWorkerKey(workerKey);

    if (!worker) {
      throw new NotFoundException(
        "MT5 worker not found.",
      );
    }

    return this.toPublic(
      await this.repository.setStatus(
        workerKey,
        status,
        lastError,
      ),
    );
  }

  async setStatusById(
    workerId: string,
    status: Mt5WorkerStatus,
    lastError?: string | null,
  ): Promise<PublicMt5Worker> {
    const worker =
      await this.repository.findById(workerId);

    if (!worker) {
      throw new NotFoundException(
        "MT5 worker not found.",
      );
    }

    return this.setStatus(
      worker.workerKey,
      status,
      lastError,
    );
  }

  async getWorker(
    workerId: string,
  ): Promise<Mt5Worker> {
    const worker =
      await this.repository.findById(workerId);

    if (!worker) {
      throw new NotFoundException(
        "MT5 worker not found.",
      );
    }

    return worker;
  }

  async getAvailableWorkers(
    now = new Date(),
  ): Promise<Mt5Worker[]> {
    const heartbeatSince = new Date(
      now.getTime() -
        DEFAULT_HEARTBEAT_TIMEOUT_SECONDS * 1000,
    );

    return this.repository.listAvailable(
      heartbeatSince,
    );
  }

  private toPublic(
    worker: Mt5Worker,
  ): PublicMt5Worker {
    const {
      authSecretHash: _secret,
      gatewaySecretEnc: _gatewaySecret,
      ...publicWorker
    } = worker;

    return publicWorker;
  }
}
