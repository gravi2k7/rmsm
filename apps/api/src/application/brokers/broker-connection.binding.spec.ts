import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import {
  BrokerConnectionStatus,
  BrokerProvider,
} from "@rmsm/database";
import { BrokerConnectionService } from "./broker-connection.service";
import type { BrokerConnectionRepository } from "./contracts/broker-connection.repository";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";
import type { TradingAccountRepository } from "../trading/trading.repository";
import { ProjectXClient } from "../../infrastructure/brokers/projectx/projectx.client";

describe("BrokerConnectionService.bindAccount", () => {
  const repository = {
    findById: jest.fn(),
  } as unknown as BrokerConnectionRepository;

  const encryption = {
    decrypt: jest.fn(),
  } as unknown as BrokerCredentialsEncryptionService;

  const tradingAccountRepository = {
    findById: jest.fn(),
    bindBroker: jest.fn(),
  } as unknown as TradingAccountRepository;

  const connection = {
    id: "connection-1",
    organizationId: "org-1",
    provider: BrokerProvider.PROJECTX,
    name: "ProjectX Demo",
    credentialsEnc: "encrypted",
    status: BrokerConnectionStatus.ACTIVE,
    lastConnectionTestAt: new Date(),
    lastConnectionTestStatus: "Connected",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(repository.findById).mockResolvedValue(connection);

    jest.mocked(encryption.decrypt).mockReturnValue({
      username: "user",
      apiKey: "secret",
    });

    jest.mocked(tradingAccountRepository.findById).mockResolvedValue({
      id: "trading-account-1",
    } as never);

    jest.mocked(tradingAccountRepository.bindBroker).mockResolvedValue({
      id: "trading-account-1",
    } as never);
  });

  function mockProjectXAccounts(accounts: unknown[]) {
    jest
      .spyOn(ProjectXClient.prototype, "getAccounts")
      .mockResolvedValue({
        accounts,
      } as never);
  }

  it("binds a valid tradable ProjectX account", async () => {
    mockProjectXAccounts([
      {
        id: 12345,
        name: "Topstep Demo",
        balance: 100000,
        canTrade: true,
      },
    ]);

    const service = new BrokerConnectionService(
      repository,
      encryption,
      tradingAccountRepository,
    );

    const result = await service.bindAccount(
      "org-1",
      "user-1",
      "connection-1",
      {
        tradingAccountId: "trading-account-1",
        brokerAccountId: "12345",
      },
    );

    expect(
      tradingAccountRepository.bindBroker,
    ).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "trading-account-1",
      "connection-1",
      "12345",
    );

    expect(result.tradingAccountId).toBe("trading-account-1");
    expect(result.brokerAccountId).toBe("12345");
    expect(result).not.toHaveProperty("credentialsEnc");
  });

  it("rejects an inactive broker connection", async () => {
    jest.mocked(repository.findById).mockResolvedValue({
      ...connection,
      status: BrokerConnectionStatus.INACTIVE,
    });

    const service = new BrokerConnectionService(
      repository,
      encryption,
      tradingAccountRepository,
    );

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "trading-account-1",
        brokerAccountId: "12345",
      }),
    ).rejects.toThrow(
      "Broker connection must be active before an account can be bound.",
    );

    expect(tradingAccountRepository.findById).not.toHaveBeenCalled();
  });

  it("rejects a ProjectX account that is not available", async () => {
    mockProjectXAccounts([
      {
        id: 99999,
        name: "Other Account",
        balance: 100000,
        canTrade: true,
      },
    ]);

    const service = new BrokerConnectionService(
      repository,
      encryption,
      tradingAccountRepository,
    );

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "trading-account-1",
        brokerAccountId: "12345",
      }),
    ).rejects.toThrow(
      "Broker account was not found on the selected broker connection.",
    );

    expect(
      tradingAccountRepository.bindBroker,
    ).not.toHaveBeenCalled();
  });

  it("rejects a non-tradable ProjectX account", async () => {
    mockProjectXAccounts([
      {
        id: 12345,
        name: "Read Only",
        balance: 100000,
        canTrade: false,
      },
    ]);

    const service = new BrokerConnectionService(
      repository,
      encryption,
      tradingAccountRepository,
    );

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "trading-account-1",
        brokerAccountId: "12345",
      }),
    ).rejects.toThrow(
      "The selected broker account is not tradable.",
    );

    expect(
      tradingAccountRepository.bindBroker,
    ).not.toHaveBeenCalled();
  });

  it("does not bind an inaccessible RMSM trading account", async () => {
    jest.mocked(tradingAccountRepository.findById).mockResolvedValue(null);

    const service = new BrokerConnectionService(
      repository,
      encryption,
      tradingAccountRepository,
    );

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "trading-account-1",
        brokerAccountId: "12345",
      }),
    ).rejects.toThrow("Trading account not found");

    expect(
      tradingAccountRepository.bindBroker,
    ).not.toHaveBeenCalled();
  });
});
