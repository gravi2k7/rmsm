import {
  BrokerConnectionStatus,
  BrokerProvider,
} from "@rmsm/database";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BrokerConnectionService } from "./broker-connection.service";

describe("BrokerConnectionService broker binding", () => {
  const repository = {
    findById: jest.fn(),
    updateStatus: jest.fn(),
    create: jest.fn(),
    listByOrganization: jest.fn(),
  };

  const encryption = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  const tradingAccountRepository = {
    findById: jest.fn(),
    bindBroker: jest.fn(),
  };

  let service: BrokerConnectionService;

  beforeEach(() => {
    jest.clearAllMocks();

    repository.findById.mockResolvedValue({
      id: "connection-1",
      organizationId: "org-1",
      provider: BrokerProvider.PROJECTX,
      name: "TopstepX",
      status: BrokerConnectionStatus.ACTIVE,
      credentialsEnc: "encrypted",
      lastConnectionTestAt: null,
      lastConnectionTestStatus: "OK",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    encryption.decrypt.mockReturnValue({
      username: "user",
      apiKey: "key",
      baseUrl: "https://api.topstepx.com",
    });

    tradingAccountRepository.findById.mockResolvedValue({
      id: "account-1",
      organizationId: "org-1",
      ownerUserId: "user-1",
      name: "RMSM Broker",
    });

    tradingAccountRepository.bindBroker.mockResolvedValue({
      id: "account-1",
    });

    service = new BrokerConnectionService(
      repository as never,
      encryption as never,
      tradingAccountRepository as never,
    );
  });

  it("binds a tradable ProjectX account", async () => {
    jest
      .spyOn(
        require("../../infrastructure/brokers/projectx/projectx.client")
          .ProjectXClient.prototype,
        "getAccounts",
      )
      .mockResolvedValue({
        success: true,
        accounts: [
          {
            id: "broker-account-1",
            name: "TopstepX 50K",
            balance: 50000,
            canTrade: true,
            currency: "USD",
          },
        ],
      });

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "account-1",
        brokerAccountId: "broker-account-1",
      }),
    ).resolves.toMatchObject({
      tradingAccountId: "account-1",
      brokerAccountId: "broker-account-1",
      id: "connection-1",
      status: BrokerConnectionStatus.ACTIVE,
    });

    expect(tradingAccountRepository.bindBroker).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "account-1",
      "connection-1",
      "broker-account-1",
    );
  });

  it("rejects a broker account that does not exist", async () => {
    jest
      .spyOn(
        require("../../infrastructure/brokers/projectx/projectx.client")
          .ProjectXClient.prototype,
        "getAccounts",
      )
      .mockResolvedValue({
        success: true,
        accounts: [
          {
            id: "broker-account-1",
            name: "TopstepX 50K",
            balance: 50000,
            canTrade: true,
            currency: "USD",
          },
        ],
      });

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "account-1",
        brokerAccountId: "wrong-account",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tradingAccountRepository.bindBroker).not.toHaveBeenCalled();
  });

  it("rejects a non-tradable broker account", async () => {
    jest
      .spyOn(
        require("../../infrastructure/brokers/projectx/projectx.client")
          .ProjectXClient.prototype,
        "getAccounts",
      )
      .mockResolvedValue({
        success: true,
        accounts: [
          {
            id: "broker-account-1",
            name: "TopstepX 50K",
            balance: 50000,
            canTrade: false,
            currency: "USD",
          },
        ],
      });

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "account-1",
        brokerAccountId: "broker-account-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tradingAccountRepository.bindBroker).not.toHaveBeenCalled();
  });

  it("rejects binding when the broker connection is inactive", async () => {
    repository.findById.mockResolvedValue({
      id: "connection-1",
      organizationId: "org-1",
      provider: BrokerProvider.PROJECTX,
      name: "TopstepX",
      status: BrokerConnectionStatus.INACTIVE,
      credentialsEnc: "encrypted",
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "account-1",
        brokerAccountId: "broker-account-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tradingAccountRepository.bindBroker).not.toHaveBeenCalled();
  });

  it("rejects binding to a trading account the owner cannot access", async () => {
    tradingAccountRepository.findById.mockResolvedValue(null);

    await expect(
      service.bindAccount("org-1", "user-1", "connection-1", {
        tradingAccountId: "account-1",
        brokerAccountId: "broker-account-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tradingAccountRepository.bindBroker).not.toHaveBeenCalled();
  });
});
