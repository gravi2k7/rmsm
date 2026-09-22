import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import {
  TradingPositionSide,
  TradingPositionStatus,
} from "@rmsm/database";

import { BrokerSyncService } from "./broker-sync.service";
import type { BrokerConnectionService } from "../broker-connection.service";
import type { BrokerInstrumentMappingRepository } from "../contracts/broker-instrument-mapping.repository";
import type { PaperTradingRepository } from "../../trading/paper-trading.repository";
import type { TradingAccountRepository } from "../../trading/trading.repository";
import type { TransactionManager } from "@rmsm/database";

describe("BrokerSyncService", () => {
  const brokerConnectionService = {
    getAdapterForExecution: jest.fn(),
  } as unknown as BrokerConnectionService;

  const tradingAccountRepository = {
    findByAccountId: jest.fn(),
    updateBalance: jest.fn(),
  } as unknown as TradingAccountRepository;

  const mappingRepository = {
    findByConnectionAndBrokerInstrument: jest.fn(),
  } as unknown as BrokerInstrumentMappingRepository;

  const tradingRepository = {
    findOrderByBrokerOrderId: jest.fn(),
    updateOrder: jest.fn(),
    findFillByBrokerTradeId: jest.fn(),
    createFill: jest.fn(),
    listPositions: jest.fn(),
    updatePosition: jest.fn(),
    createPosition: jest.fn(),
  } as unknown as PaperTradingRepository;

  const transactionManager = {
    run: jest.fn(),
  } as unknown as TransactionManager;

  const account = {
    id: "account-1",
    organizationId: "org-1",
    ownerUserId: "user-1",
    brokerConnectionId: "connection-1",
    brokerAccountId: "12345",
  };

  const mapping = {
    instrumentId: "instrument-1",
    brokerInstrumentId: "CONTRACT-1",
  };

  const adapter = {
    getOrders: jest.fn(),
    getTrades: jest.fn(),
    getAccounts: jest.fn(),
    getPositions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(tradingAccountRepository.findByAccountId)
      .mockResolvedValue(account as never);

    jest
      .mocked(brokerConnectionService.getAdapterForExecution)
      .mockResolvedValue(adapter as never);

    jest
      .mocked(adapter.getOrders)
      .mockResolvedValue([]);

    jest
      .mocked(adapter.getTrades)
      .mockResolvedValue([]);

    jest
      .mocked(adapter.getAccounts)
      .mockResolvedValue([
        {
          id: "12345",
          name: "ProjectX Demo",
          balance: 100000,
          canTrade: true,
          currency: "USD",
        },
      ]);

    jest
      .mocked(mappingRepository.findByConnectionAndBrokerInstrument)
      .mockResolvedValue(mapping as never);

    jest
      .mocked(tradingRepository.findOrderByBrokerOrderId)
      .mockResolvedValue(null);

    jest
      .mocked(tradingRepository.findFillByBrokerTradeId)
      .mockResolvedValue(null);

    jest
      .mocked(tradingRepository.updateOrder)
      .mockResolvedValue(undefined as never);

    jest
      .mocked(tradingRepository.createFill)
      .mockResolvedValue(undefined as never);

    jest
      .mocked(tradingRepository.updatePosition)
      .mockResolvedValue(undefined as never);

    jest
      .mocked(tradingRepository.createPosition)
      .mockResolvedValue(undefined as never);

    jest
      .mocked(tradingAccountRepository.updateBalance)
      .mockResolvedValue(undefined as never);

    jest
      .mocked(transactionManager.run)
      .mockImplementation(async (callback) => callback({} as never));
  });

  it("creates an RMSM position for a mapped broker position", async () => {
    jest.mocked(adapter.getPositions).mockResolvedValue([
      {
        id: "broker-position-1",
        accountId: "12345",
        instrumentId: "CONTRACT-1",
        side: "BUY",
        quantity: 2,
        averagePrice: 25000,
      },
    ]);

    jest
      .mocked(tradingRepository.listPositions)
      .mockResolvedValue([]);

    const service = new BrokerSyncService(
      brokerConnectionService,
      tradingAccountRepository,
      mappingRepository,
      tradingRepository,
      transactionManager,
    );

    const result = await service.syncAccount("org-1", "account-1");

    expect(tradingRepository.createPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: TradingPositionSide.LONG,
        quantity: "2",
        averageEntryPrice: "25000",
        status: TradingPositionStatus.OPEN,
      }),
      expect.anything(),
    );

    expect(result.positionsReconciled).toBe(1);
  });

  it("updates an existing RMSM position from broker state", async () => {
    jest.mocked(adapter.getPositions).mockResolvedValue([
      {
        id: "broker-position-1",
        accountId: "12345",
        instrumentId: "CONTRACT-1",
        side: "SELL",
        quantity: 3,
        averagePrice: 25100,
      },
    ]);

    jest.mocked(tradingRepository.listPositions).mockResolvedValue([
      {
        id: "local-position-1",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: TradingPositionSide.SHORT,
        quantity: "1",
        averageEntryPrice: "25050",
        status: TradingPositionStatus.OPEN,
      },
    ] as never);

    const service = new BrokerSyncService(
      brokerConnectionService,
      tradingAccountRepository,
      mappingRepository,
      tradingRepository,
      transactionManager,
    );

    const result = await service.syncAccount("org-1", "account-1");

    expect(tradingRepository.updatePosition).toHaveBeenCalledWith(
      "local-position-1",
      {
        quantity: "3",
        averageEntryPrice: "25100",
      },
      expect.anything(),
    );

    expect(result.positionsReconciled).toBe(1);
    expect(tradingRepository.createPosition).not.toHaveBeenCalled();
  });

  it("closes an RMSM position that no longer exists at the broker", async () => {
    jest.mocked(adapter.getPositions).mockResolvedValue([]);

    jest.mocked(tradingRepository.listPositions).mockResolvedValue([
      {
        id: "local-position-1",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: TradingPositionSide.LONG,
        quantity: "2",
        averageEntryPrice: "25000",
        status: TradingPositionStatus.OPEN,
      },
    ] as never);

    const service = new BrokerSyncService(
      brokerConnectionService,
      tradingAccountRepository,
      mappingRepository,
      tradingRepository,
      transactionManager,
    );

    const result = await service.syncAccount("org-1", "account-1");

    expect(tradingRepository.updatePosition).toHaveBeenCalledWith(
      "local-position-1",
      expect.objectContaining({
        quantity: "0",
        status: TradingPositionStatus.CLOSED,
        closedAt: expect.any(Date),
      }),
      expect.anything(),
    );

    expect(result.positionsReconciled).toBe(1);
  });
});
