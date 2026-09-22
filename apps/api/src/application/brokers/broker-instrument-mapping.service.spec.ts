import {
  BrokerConnectionStatus,
  BrokerProvider,
} from "@rmsm/database";
import { ConflictException, BadRequestException } from "@nestjs/common";
import { BrokerInstrumentMappingService } from "./broker-instrument-mapping.service";

describe("BrokerInstrumentMappingService", () => {
  const mappingRepository = {
    create: jest.fn(),
    listByConnection: jest.fn(),
    findByConnectionAndInstrument: jest.fn(),
    findByConnectionAndBrokerInstrument: jest.fn(),
    delete: jest.fn(),
  };

  const connectionRepository = {
    findById: jest.fn(),
  };

  const encryption = {
    decrypt: jest.fn(),
  };

  let service: BrokerInstrumentMappingService;

  beforeEach(() => {
    jest.clearAllMocks();

    connectionRepository.findById.mockResolvedValue({
      id: "connection-1",
      organizationId: "org-1",
      provider: BrokerProvider.PROJECTX,
      status: BrokerConnectionStatus.ACTIVE,
      credentialsEnc: "encrypted",
    });

    mappingRepository.findByConnectionAndInstrument.mockResolvedValue(null);
    mappingRepository.findByConnectionAndBrokerInstrument.mockResolvedValue(
      null,
    );

    service = new BrokerInstrumentMappingService(
      mappingRepository as never,
      connectionRepository as never,
      encryption as never,
    );
  });

  it("lists mappings for an active connection", async () => {
    const mappings = [{ id: "mapping-1" }];
    mappingRepository.listByConnection.mockResolvedValue(mappings);

    await expect(
      service.list("org-1", "connection-1"),
    ).resolves.toEqual(mappings);

    expect(mappingRepository.listByConnection).toHaveBeenCalledWith(
      "connection-1",
    );
  });

  it("creates a mapping", async () => {
    const created = { id: "mapping-1" };
    mappingRepository.create.mockResolvedValue(created);

    await expect(
      service.create("org-1", "connection-1", {
        instrumentId: "instrument-1",
        brokerSymbol: " ESU6 ",
        brokerInstrumentId: "CON.F.US.EP.202609",
      }),
    ).resolves.toEqual(created);

    expect(mappingRepository.create).toHaveBeenCalledWith({
      brokerConnectionId: "connection-1",
      instrumentId: "instrument-1",
      brokerSymbol: "ESU6",
      brokerInstrumentId: "CON.F.US.EP.202609",
    });
  });

  it("rejects duplicate RMSM instrument mapping", async () => {
    mappingRepository.findByConnectionAndInstrument.mockResolvedValue({
      id: "existing",
    });

    await expect(
      service.create("org-1", "connection-1", {
        instrumentId: "instrument-1",
        brokerSymbol: "ESU6",
        brokerInstrumentId: "contract-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mappingRepository.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate broker instrument mapping", async () => {
    mappingRepository.findByConnectionAndBrokerInstrument.mockResolvedValue({
      id: "existing",
    });

    await expect(
      service.create("org-1", "connection-1", {
        instrumentId: "instrument-1",
        brokerSymbol: "ESU6",
        brokerInstrumentId: "contract-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mappingRepository.create).not.toHaveBeenCalled();
  });

  it("deletes a mapping within the selected connection", async () => {
    await service.remove("org-1", "connection-1", "mapping-1");

    expect(mappingRepository.delete).toHaveBeenCalledWith(
      "connection-1",
      "mapping-1",
    );
  });

  it("discovers ProjectX contracts", async () => {
    encryption.decrypt.mockReturnValue({
      username: "user",
      apiKey: "key",
      baseUrl: "https://api.topstepx.com",
    });

    const searchContracts = jest
      .spyOn(
        require("../../infrastructure/brokers/projectx/projectx.client")
          .ProjectXClient.prototype,
        "searchContracts",
      )
      .mockResolvedValue({
        success: true,
        contracts: [
          {
            id: "contract-1",
            name: "ES",
            description: "E-mini S&P",
            tickSize: 0.25,
            tickValue: 12.5,
            activeContract: true,
            symbolId: "ES",
          },
        ],
      });

    await expect(
      service.discoverContracts(
        "org-1",
        "connection-1",
        "ES",
        false,
      ),
    ).resolves.toHaveLength(1);

    expect(searchContracts).toHaveBeenCalledWith("ES", false);

    searchContracts.mockRestore();
  });

  it("rejects ProjectX discovery for another provider", async () => {
    connectionRepository.findById.mockResolvedValue({
      id: "connection-1",
      organizationId: "org-1",
      provider: BrokerProvider.CTRADER,
      status: BrokerConnectionStatus.ACTIVE,
      credentialsEnc: "encrypted",
    });

    await expect(
      service.discoverContracts("org-1", "connection-1", "ES"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects operations on an inactive connection", async () => {
    connectionRepository.findById.mockResolvedValue({
      id: "connection-1",
      organizationId: "org-1",
      provider: BrokerProvider.PROJECTX,
      status: BrokerConnectionStatus.INACTIVE,
      credentialsEnc: "encrypted",
    });

    await expect(
      service.list("org-1", "connection-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
