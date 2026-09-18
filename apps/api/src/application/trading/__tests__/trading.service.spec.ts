jest.mock("@rmsm/database", () => ({
  TradingAccountType: {
    DEMO: "DEMO",
    LIVE: "LIVE",
  },
  TradingAccountStatus: {
    ACTIVE: "ACTIVE",
    RESET: "RESET",
    CLOSED: "CLOSED",
  },
  TradingLedgerEntryType: {
    INITIAL_DEPOSIT: "INITIAL_DEPOSIT",
    VIRTUAL_DEPOSIT: "VIRTUAL_DEPOSIT",
    RESET: "RESET",
    WITHDRAWAL: "WITHDRAWAL",
    TRADE_DEBIT: "TRADE_DEBIT",
    TRADE_CREDIT: "TRADE_CREDIT",
    FEE: "FEE",
    ADJUSTMENT: "ADJUSTMENT",
  },
}));

import {
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  TradingAccountStatus,
  TradingAccountType,
  TradingLedgerEntryType,
  type TradingAccount,
} from "@rmsm/database";
import { TradingAccountService } from "../trading.service";
import { TRADING_ACCOUNT_REPOSITORY } from "../trading.tokens";
import type { TradingAccountRepository } from "../trading.repository";

describe("TradingAccountService", () => {
  let repository: jest.Mocked<TradingAccountRepository>;
  let transactionManager: {
    run: jest.Mock;
  };
  let service: TradingAccountService;

  const decimal = (value: number) => ({
    toString: () => String(value),
    valueOf: () => value,
  }) as unknown as TradingAccount["balance"];

  const account: TradingAccount = {
    id: "account-1",
    organizationId: "org-1",
    ownerUserId: "user-1",
    type: TradingAccountType.DEMO,
    name: "Demo Account",
    currency: "USD",
    startingBalance: decimal(100000),
    balance: decimal(100000),
    leverage: decimal(10),
    status: TradingAccountStatus.ACTIVE,
    brokerConnectionId: null,
    brokerAccountId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    closedAt: null,
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateBalance: jest.fn(),
      addLedgerEntry: jest.fn(),
      listLedger: jest.fn(),
    };

    transactionManager = {
      run: jest.fn(async (fn: (client: object) => unknown) =>
        fn({}),
      ),
    };

    service = new TradingAccountService(
      repository,
      transactionManager as never,
    );
  });

  it("creates a Demo account and initial ledger entry atomically", async () => {
    repository.create.mockResolvedValue(account);
    repository.addLedgerEntry.mockResolvedValue({} as never);

    const result = await service.createDemoAccount(
      "org-1",
      "user-1",
      {
        name: " My Demo ",
        currency: "usd",
        startingBalance: 100000,
      },
    );

    expect(result).toBe(account);

    expect(transactionManager.run).toHaveBeenCalledTimes(1);

    expect(repository.create).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        ownerUserId: "user-1",
        type: TradingAccountType.DEMO,
        name: "My Demo",
        currency: "USD",
        startingBalance: 100000,
        balance: 100000,
        leverage: 1,
      },
      expect.anything(),
    );

    expect(
      repository.addLedgerEntry,
    ).toHaveBeenCalledWith(
      {
        accountId: "account-1",
        type: TradingLedgerEntryType.INITIAL_DEPOSIT,
        amount: 100000,
        balanceAfter: 100000,
        reference: "demo-account-created",
      },
      expect.anything(),
    );
  });

  it("rejects a non-positive starting balance", async () => {
    await expect(
      service.createDemoAccount(
        "org-1",
        "user-1",
        {
          name: "Demo",
          currency: "USD",
          startingBalance: 0,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
    expect(transactionManager.run).not.toHaveBeenCalled();
  });

  it("adds virtual funds and records one ledger entry", async () => {
    repository.findById.mockResolvedValue({
      ...account,
      balance: 100000,
    } as never);

    repository.updateBalance.mockResolvedValue({
      ...account,
      balance: 125000,
    } as never);

    repository.addLedgerEntry.mockResolvedValue({
      accountId: "account-1",
      type: TradingLedgerEntryType.VIRTUAL_DEPOSIT,
      amount: 25000,
      balanceAfter: 125000,
    } as never);

    const result = await service.addVirtualFunds(
      "org-1",
      "user-1",
      "account-1",
      25000,
    );

    expect(result.balance).toBe(125000);

    expect(repository.updateBalance).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "account-1",
      125000,
      TradingAccountStatus.ACTIVE,
      expect.anything(),
    );

    expect(
      repository.addLedgerEntry,
    ).toHaveBeenCalledWith(
      {
        accountId: "account-1",
        type: TradingLedgerEntryType.VIRTUAL_DEPOSIT,
        amount: 25000,
        balanceAfter: 125000,
        reference: "virtual-funds-added",
      },
      expect.anything(),
    );
  });

  it("rejects virtual funds on a missing account", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.addVirtualFunds(
        "org-1",
        "user-1",
        "missing",
        1000,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.updateBalance).not.toHaveBeenCalled();
    expect(repository.addLedgerEntry).not.toHaveBeenCalled();
  });

  it("rejects virtual funds on a non-Demo account", async () => {
    repository.findById.mockResolvedValue({
      ...account,
      type: TradingAccountType.LIVE,
    } as never);

    await expect(
      service.addVirtualFunds(
        "org-1",
        "user-1",
        "account-1",
        1000,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.updateBalance).not.toHaveBeenCalled();
    expect(repository.addLedgerEntry).not.toHaveBeenCalled();
  });

  it("rejects virtual funds on an inactive account", async () => {
    repository.findById.mockResolvedValue({
      ...account,
      status: TradingAccountStatus.CLOSED,
    } as never);

    await expect(
      service.addVirtualFunds(
        "org-1",
        "user-1",
        "account-1",
        1000,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("resets a Demo account to its starting balance and remains ACTIVE", async () => {
    repository.findById.mockResolvedValue({
      ...account,
      balance: 73500,
      startingBalance: 100000,
    } as never);

    repository.updateBalance.mockResolvedValue({
      ...account,
      balance: 100000,
      status: TradingAccountStatus.ACTIVE,
    } as never);

    repository.addLedgerEntry.mockResolvedValue({} as never);

    const result = await service.resetDemoAccount(
      "org-1",
      "user-1",
      "account-1",
    );

    expect(result.balance).toBe(100000);
    expect(result.status).toBe(
      TradingAccountStatus.ACTIVE,
    );

    expect(repository.updateBalance).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "account-1",
      100000,
      TradingAccountStatus.ACTIVE,
      expect.anything(),
    );

    expect(
      repository.addLedgerEntry,
    ).toHaveBeenCalledWith(
      {
        accountId: "account-1",
        type: TradingLedgerEntryType.RESET,
        amount: 26500,
        balanceAfter: 100000,
        reference: "demo-account-reset",
      },
      expect.anything(),
    );
  });

  it("blocks access when the repository does not find the account", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.getAccount(
        "org-1",
        "user-1",
        "account-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.resetDemoAccount(
        "org-1",
        "user-1",
        "account-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists only repository-scoped accounts", async () => {
    repository.findMany.mockResolvedValue([
      account,
    ] as never);

    const result = await service.listAccounts(
      "org-1",
      "user-1",
    );

    expect(result).toEqual([account]);
    expect(repository.findMany).toHaveBeenCalledWith(
      "org-1",
      "user-1",
    );
  });
});
