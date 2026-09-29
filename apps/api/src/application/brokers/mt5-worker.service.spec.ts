import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  Mt5WorkerStatus,
  type Mt5Worker,
} from "@rmsm/database";

import { Mt5WorkerService } from "./mt5-worker.service";
import type { Mt5WorkerRepository } from "./mt5-worker.repository";

describe("Mt5WorkerService", () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByWorkerKey: jest.fn(),
    listAll: jest.fn(),
    listAvailable: jest.fn(),
    updateAuthSecretHash: jest.fn(),
    heartbeat: jest.fn(),
    setStatus: jest.fn(),
  } as unknown as Mt5WorkerRepository;

  let service: Mt5WorkerService;

  const makeWorker = (
    overrides: Partial<Mt5Worker> = {},
  ): Mt5Worker => ({
    id: "worker-1",
    workerKey: "worker-a",
    name: "Worker A",
    gatewayUrl: "http://worker-a:8222",
    authSecretHash: "a".repeat(64),
    status: Mt5WorkerStatus.OFFLINE,
    lastHeartbeatAt: null,
    lastError: null,
    createdAt: new Date("2026-09-24T10:00:00.000Z"),
    updatedAt: new Date("2026-09-24T10:00:00.000Z"),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new Mt5WorkerService(repository);
  });

  it("provisions a new worker and returns the secret once", async () => {
    jest.mocked(repository.findByWorkerKey)
      .mockResolvedValue(null);

    const created = makeWorker();

    jest.mocked(repository.create)
      .mockResolvedValue(created);

    const result = await service.provisionWorker({
      workerKey: " worker-a ",
      name: " Worker A ",
      gatewayUrl: " http://worker-a:8222 ",
    });

    expect(repository.create).toHaveBeenCalledTimes(1);

    const createInput =
      jest.mocked(repository.create).mock.calls[0]?.[0];

    expect(createInput).toMatchObject({
      workerKey: "worker-a",
      name: "Worker A",
      gatewayUrl: "http://worker-a:8222",
    });

    expect(createInput?.authSecretHash)
      .toMatch(/^[a-f0-9]{64}$/);

    expect(result.secret).toBeTruthy();
    expect(result.secret.length).toBeGreaterThan(40);

    expect(result.worker).toEqual(
      expect.not.objectContaining({
        authSecretHash: expect.anything(),
      }),
    );

    expect(result.worker.workerKey).toBe("worker-a");
  });

  it("rejects a duplicate worker key", async () => {
    jest.mocked(repository.findByWorkerKey)
      .mockResolvedValue(makeWorker());

    await expect(
      service.provisionWorker({
        workerKey: "worker-a",
        name: "Worker A",
        gatewayUrl: "http://worker-a:8222",
      }),
    ).rejects.toThrow(
      "MT5 worker key already exists.",
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("lists workers without exposing secret hashes", async () => {
    jest.mocked(repository.listAll)
      .mockResolvedValue([
        makeWorker({
          status: Mt5WorkerStatus.ACTIVE,
        }),
      ]);

    const result = await service.listWorkers();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.not.objectContaining({
        authSecretHash: expect.anything(),
      }),
    );
    expect(result[0]?.workerKey).toBe("worker-a");
  });

  it("rotates a worker secret and returns the new secret once", async () => {
    jest.mocked(repository.findById)
      .mockResolvedValue(makeWorker());

    const updated = makeWorker({
      authSecretHash: "b".repeat(64),
    });

    jest.mocked(repository.updateAuthSecretHash)
      .mockResolvedValue(updated);

    const result = await service.rotateSecret("worker-1");

    expect(repository.updateAuthSecretHash)
      .toHaveBeenCalledTimes(1);

    const [workerId, newHash] =
      jest.mocked(repository.updateAuthSecretHash)
        .mock.calls[0] ?? [];

    expect(workerId).toBe("worker-1");
    expect(newHash).toMatch(/^[a-f0-9]{64}$/);
    expect(newHash).not.toBe("a".repeat(64));

    expect(result.secret).toBeTruthy();
    expect(result.worker).toEqual(
      expect.not.objectContaining({
        authSecretHash: expect.anything(),
      }),
    );
  });

  it("returns an available worker", async () => {
    const now = new Date("2026-09-24T10:05:00.000Z");

    const worker = makeWorker({
      status: Mt5WorkerStatus.ACTIVE,
      lastHeartbeatAt: new Date(
        "2026-09-24T10:04:00.000Z",
      ),
    });

    jest.mocked(repository.listAvailable)
      .mockResolvedValue([worker]);

    const result =
      await service.getAvailableWorker(now);

    expect(result).toBe(worker);

    const heartbeatSince =
      jest.mocked(repository.listAvailable)
        .mock.calls[0]?.[0];

    expect(heartbeatSince).toEqual(
      new Date("2026-09-24T10:03:30.000Z"),
    );
  });

  it("fails when no MT5 worker is available", async () => {
    jest.mocked(repository.listAvailable)
      .mockResolvedValue([]);

    await expect(
      service.getAvailableWorker(
        new Date("2026-09-24T10:05:00.000Z"),
      ),
    ).rejects.toThrow(
      "No available MT5 worker is online.",
    );
  });

  it("accepts an active worker with a fresh heartbeat for execution", async () => {
    const now = new Date("2026-09-24T10:05:00.000Z");

    const worker = makeWorker({
      status: Mt5WorkerStatus.ACTIVE,
      lastHeartbeatAt: new Date(
        "2026-09-24T10:04:30.000Z",
      ),
    });

    jest.mocked(repository.findById)
      .mockResolvedValue(worker);

    const result =
      await service.getExecutionWorker(
        "worker-1",
        now,
      );

    expect(result).toBe(worker);
  });

  it("rejects an offline execution worker", async () => {
    jest.mocked(repository.findById)
      .mockResolvedValue(
        makeWorker({
          status: Mt5WorkerStatus.OFFLINE,
          lastHeartbeatAt: new Date(
            "2026-09-24T10:04:30.000Z",
          ),
        }),
      );

    await expect(
      service.getExecutionWorker(
        "worker-1",
        new Date("2026-09-24T10:05:00.000Z"),
      ),
    ).rejects.toThrow(
      "Assigned MT5 worker is not available.",
    );
  });

  it("records a worker heartbeat", async () => {
    const heartbeatAt =
      new Date("2026-09-24T10:06:00.000Z");

    const existing = makeWorker({
      status: Mt5WorkerStatus.ACTIVE,
    });

    const updated = makeWorker({
      status: Mt5WorkerStatus.ACTIVE,
      lastHeartbeatAt: heartbeatAt,
    });

    jest.mocked(repository.findByWorkerKey)
      .mockResolvedValue(existing);

    jest.mocked(repository.heartbeat)
      .mockResolvedValue(updated);

    const result = await service.heartbeat(
      "worker-a",
      heartbeatAt,
    );

    expect(repository.heartbeat)
      .toHaveBeenCalledWith(
        "worker-a",
        heartbeatAt,
      );

    expect(result).toEqual(
      expect.not.objectContaining({
        authSecretHash: expect.anything(),
      }),
    );
  });

  it("updates worker status by id", async () => {
    const existing = makeWorker();

    jest.mocked(repository.findById)
      .mockResolvedValue(existing);

    jest.mocked(repository.setStatus)
      .mockResolvedValue(
        makeWorker({
          status: Mt5WorkerStatus.DRAINING,
          lastError: null,
        }),
      );

    const result =
      await service.setStatusById(
        "worker-1",
        Mt5WorkerStatus.DRAINING,
      );

    expect(repository.setStatus)
      .toHaveBeenCalledWith(
        "worker-a",
        Mt5WorkerStatus.DRAINING,
        undefined,
      );

    expect(result.status)
      .toBe(Mt5WorkerStatus.DRAINING);
  });
});
