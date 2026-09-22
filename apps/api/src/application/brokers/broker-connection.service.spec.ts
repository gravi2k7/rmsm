import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { BrokerProvider, BrokerConnectionStatus } from "@rmsm/database";
import { BrokerConnectionService } from "./broker-connection.service";
import type { BrokerConnectionRepository } from "./contracts/broker-connection.repository";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";
import type { TradingAccountRepository } from "../trading/trading.repository";

describe("BrokerConnectionService", () => {
  const repository = {
    create: jest.fn(),
    listByOrganization: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  } as unknown as BrokerConnectionRepository;

  const encryption = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  } as unknown as BrokerCredentialsEncryptionService;

  const tradingAccountRepository = {
    findById: jest.fn(),
    bindBroker: jest.fn(),
  } as unknown as TradingAccountRepository;

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
    });

    const service = new BrokerConnectionService(repository, encryption, tradingAccountRepository);

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
  });

  it("lists connections by organization", async () => {
    jest.mocked(repository.listByOrganization).mockResolvedValue([]);

    const service = new BrokerConnectionService(repository, encryption, tradingAccountRepository);

    await service.list("org-1");

    expect(repository.listByOrganization).toHaveBeenCalledWith("org-1");
  });
});
