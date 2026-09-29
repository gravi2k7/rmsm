import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import {
  BrokerProvider,
  BrokerConnectionStatus,
  type Mt5Worker,
} from "@rmsm/database";

import { BrokerConnectionService } from "./broker-connection.service";
import { MetaTrader5Adapter } from "../../infrastructure/brokers/mt5/mt5.adapter";
import type { BrokerConnectionRepository } from "./contracts/broker-connection.repository";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";
import type { TradingAccountRepository } from "../trading/trading.repository";
import type { Mt5WorkerService } from "./mt5-worker.service";

describe("BrokerConnectionService", () => {
  const repository = {
    create: jest.fn(),
    listByOrganization: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    tryAssignMt5Worker: jest.fn(),
    releaseMt5Worker: jest.fn(),
  } as unknown as BrokerConnectionRepository;

  const encryption = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  } as unknown as BrokerCredentialsEncryptionService;

  const tradingAccountRepository = {
    findById: jest.fn(),
    bindBroker: jest.fn(),
  } as unknown as TradingAccountRepository;

  const mt5WorkerService = {
    getAvailableWorker: jest.fn(),
    getExecutionWorker: jest.fn(),
  } as unknown as Mt5WorkerService;

  const worker: Mt5Worker = {
    id: "worker-1",
    workerKey: "worker-a",
    name: "Worker A",
    gatewayUrl: "http://worker-a:8222",
    status: "ACTIVE",
    lastHeartbeatAt: new Date("2026-09-24T10:00:00.000Z"),
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const config = {
    MT5_GATEWAY_URL: "http://legacy-global-gateway:8222",
    MT5_TIMEOUT: 60000,
    MT5_MAX_RETRY: 2,
    MT5_HEARTBEAT: 30,
  } as never;

  const createService = () =>
    new BrokerConnectionService(
      repository,
      encryption,
      tradingAccountRepository,
      config,
      mt5WorkerService,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("encrypts ProjectX credentials before persistence", async () => {
    jest.mocked(encryption.encrypt).mockReturnValue("encrypted");

    jest.mocked(repository.create).mockResolvedValue({
      id: "connection-1",
      organizationId: "org-1",
      provider: BrokerProvider.PROJECTX,
      name: "ProjectX Demo",
      credentialsEnc: "encrypted",
      status: BrokerConnectionStatus.INACTIVE,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mt5WorkerId: null,
    });

    const service = createService();

    await service.create("org-1", {
      provider: BrokerProvider.PROJECTX,
      name: "ProjectX Demo",
      username: "user",
      apiKey: "secret",
    });

    expect(encryption.encrypt).toHaveBeenCalledWith({
      username: "user",
      apiKey: "secret",
    });

    expect(repository.create).toHaveBeenCalledWith({
      organizationId: "org-1",
      provider: BrokerProvider.PROJECTX,
      name: "ProjectX Demo",
      credentialsEnc: "encrypted",
    });

    expect(
      mt5WorkerService.getAvailableWorker,
    ).not.toHaveBeenCalled();
  });

  it("does not reserve a worker when creating an MT5 connection", async () => {
    jest.mocked(encryption.encrypt).mockReturnValue(
      "encrypted-mt5",
    );

    jest.mocked(repository.create).mockResolvedValue({
      id: "connection-mt5",
      organizationId: "org-1",
      provider: BrokerProvider.MT5,
      name: "Pepperstone Demo",
      credentialsEnc: "encrypted-mt5",
      status: BrokerConnectionStatus.INACTIVE,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mt5WorkerId: null,
    });

    const service = createService();

    await service.create("org-1", {
      provider: BrokerProvider.MT5,
      name: "Pepperstone Demo",
      login: "123456",
      password: "secret",
      server: "Demo-Server",
    });

    expect(
      mt5WorkerService.getAvailableWorker,
    ).not.toHaveBeenCalled();

    expect(repository.create).toHaveBeenCalledWith({
      organizationId: "org-1",
      provider: BrokerProvider.MT5,
      name: "Pepperstone Demo",
      credentialsEnc: "encrypted-mt5",
    });
  });

  it("claims a worker during MT5 connection test", async () => {
    const connection = {
      id: "connection-mt5",
      organizationId: "org-1",
      provider: BrokerProvider.MT5,
      name: "Pepperstone Demo",
      credentialsEnc: "encrypted-mt5",
      status: BrokerConnectionStatus.INACTIVE,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mt5WorkerId: null,
    };

    const assignedConnection = {
      ...connection,
      mt5WorkerId: "worker-1",
    };

    jest.mocked(repository.findById).mockResolvedValue(
      connection,
    );

    jest.mocked(
      mt5WorkerService.getAvailableWorker,
    ).mockResolvedValue(worker);

    jest.mocked(
      repository.tryAssignMt5Worker,
    ).mockResolvedValue({
      connection: assignedConnection,
      assigned: true,
    });

    jest.mocked(
      mt5WorkerService.getExecutionWorker,
    ).mockResolvedValue(worker);

    jest.mocked(encryption.decrypt).mockReturnValue({
      login: "123456",
      password: "secret",
      server: "Demo-Server",
    });

    jest.mocked(repository.updateStatus)
      .mockResolvedValue({
        ...assignedConnection,
        status: BrokerConnectionStatus.ACTIVE,
      });

    const testConnection = jest.fn().mockResolvedValue({
      success: true,
      message: "Connected to MetaTrader 5 account 123456",
      brokerAccountId: "123456",
    });

    const getAccounts = jest.fn().mockResolvedValue([]);

    const fromCredentials = jest
      .spyOn(MetaTrader5Adapter, "fromCredentials")
      .mockReturnValue({
        provider: "MT5",
        testConnection,
        getAccounts,
      } as never);

    const service = createService();

    await service.test(
      "org-1",
      "connection-mt5",
    );

    expect(
      mt5WorkerService.getAvailableWorker,
    ).toHaveBeenCalledTimes(1);

    expect(
      repository.tryAssignMt5Worker,
    ).toHaveBeenCalledWith(
      "org-1",
      "connection-mt5",
      "worker-1",
    );

    expect(fromCredentials).toHaveBeenCalledWith(
      {
        login: "123456",
        password: "secret",
        server: "Demo-Server",
      },
      expect.objectContaining({
        gatewayUrl: "http://worker-a:8222",
      }),
    );

    expect(testConnection).toHaveBeenCalledTimes(1);

    fromCredentials.mockRestore();
  });

  it("releases a newly claimed worker when MT5 test fails", async () => {
    const connection = {
      id: "connection-mt5",
      organizationId: "org-1",
      provider: BrokerProvider.MT5,
      name: "Pepperstone Demo",
      credentialsEnc: "encrypted-mt5",
      status: BrokerConnectionStatus.INACTIVE,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mt5WorkerId: null,
    };

    const assignedConnection = {
      ...connection,
      mt5WorkerId: "worker-1",
    };

    jest.mocked(repository.findById).mockResolvedValue(
      connection,
    );

    jest.mocked(
      mt5WorkerService.getAvailableWorker,
    ).mockResolvedValue(worker);

    jest.mocked(
      repository.tryAssignMt5Worker,
    ).mockResolvedValue({
      connection: assignedConnection,
      assigned: true,
    });

    jest.mocked(
      mt5WorkerService.getExecutionWorker,
    ).mockResolvedValue(worker);

    jest.mocked(encryption.decrypt).mockReturnValue({
      login: "123456",
      password: "secret",
      server: "Demo-Server",
    });

    jest.mocked(repository.releaseMt5Worker)
      .mockResolvedValue(connection);

    jest
      .spyOn(MetaTrader5Adapter, "fromCredentials")
      .mockReturnValue({
        provider: "MT5",
        testConnection: jest.fn().mockRejectedValue(
          new Error("MT5 authentication failed"),
        ),
      } as never);

    const service = createService();

    await expect(
      service.test("org-1", "connection-mt5"),
    ).rejects.toThrow(
      "MT5 authentication failed",
    );

    expect(
      repository.releaseMt5Worker,
    ).toHaveBeenCalledWith(
      "org-1",
      "connection-mt5",
      "worker-1",
    );

    jest.restoreAllMocks();
  });


  it("lists connections by organization", async () => {
    jest.mocked(repository.listByOrganization).mockResolvedValue([]);

    const service = createService();

    await service.list("org-1");

    expect(
      repository.listByOrganization,
    ).toHaveBeenCalledWith("org-1");
  });

  it("uses the assigned worker gateway for MT5 execution", async () => {
    const connection = {
      id: "connection-mt5",
      organizationId: "org-1",
      provider: BrokerProvider.MT5,
      name: "Pepperstone Demo",
      credentialsEnc: "encrypted-mt5",
      status: BrokerConnectionStatus.ACTIVE,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mt5WorkerId: "worker-1",
    };

    jest.mocked(repository.findById).mockResolvedValue(
      connection,
    );

    jest.mocked(encryption.decrypt).mockReturnValue({
      login: "123456",
      password: "secret",
      server: "Demo-Server",
    });

    jest.mocked(
      mt5WorkerService.getExecutionWorker,
    ).mockResolvedValue(worker);

    const testConnection = jest.fn().mockResolvedValue({
      success: true,
      message:
        "Connected to MetaTrader 5 account 123456",
      brokerAccountId: "123456",
    });

    const fromCredentials = jest
      .spyOn(MetaTrader5Adapter, "fromCredentials")
      .mockReturnValue({
        provider: "MT5",
        testConnection,
      } as never);

    const service = createService();

    await expect(
      service.getAdapterForExecution(
        "org-1",
        "connection-mt5",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: "MT5",
      }),
    );

    expect(
      mt5WorkerService.getExecutionWorker,
    ).toHaveBeenCalledWith("worker-1");

    expect(testConnection).toHaveBeenCalledTimes(1);

    expect(fromCredentials).toHaveBeenCalledWith(
      {
        login: "123456",
        password: "secret",
        server: "Demo-Server",
      },
      {
        gatewayUrl: "http://worker-a:8222",
        timeoutMs: 60000,
        maxRetry: 2,
        heartbeatSeconds: 30,
      },
    );

    fromCredentials.mockRestore();
  });
});
