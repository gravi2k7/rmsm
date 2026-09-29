import type {
  Mt5Worker,
  Mt5WorkerStatus,
} from "@rmsm/database";

export interface CreateMt5WorkerInput {
  workerKey: string;
  name: string;
  gatewayUrl: string;
  authSecretHash: string;
  gatewaySecretEnc: string;
}

export interface Mt5WorkerRepository {
  create(input: CreateMt5WorkerInput): Promise<Mt5Worker>;

  findById(id: string): Promise<Mt5Worker | null>;

  findByWorkerKey(workerKey: string): Promise<Mt5Worker | null>;

  listAll(): Promise<Mt5Worker[]>;

  listAvailable(
    heartbeatSince: Date,
  ): Promise<Mt5Worker[]>;

  updateSecrets(
    id: string,
    authSecretHash: string,
    gatewaySecretEnc: string,
  ): Promise<Mt5Worker>;

  heartbeat(
    workerKey: string,
    heartbeatAt: Date,
  ): Promise<Mt5Worker>;

  setStatus(
    workerKey: string,
    status: Mt5WorkerStatus,
    lastError?: string | null,
  ): Promise<Mt5Worker>;
}
