import {
  TradingAccountType,
  TradingAccountStatus,
  TradingLedgerEntryType,
  TransactionManager,
  type TradingAccount,
  type TradingLedgerEntry,
} from "@rmsm/database";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { TRADING_ACCOUNT_REPOSITORY } from "./trading.tokens";
import type { TradingAccountRepository } from "./trading.repository";

@Injectable()
export class TradingAccountService {
  constructor(
    @Inject(TRADING_ACCOUNT_REPOSITORY)
    private readonly repository: TradingAccountRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  async createDemoAccount(
    organizationId: string,
    ownerUserId: string,
    input: {
      name: string;
      currency: string;
      startingBalance: number;
      leverage?: number;
    },
  ): Promise<TradingAccount> {
    if (input.startingBalance <= 0) {
      throw new BadRequestException(
        "Starting balance must be greater than zero",
      );
    }

    return this.transactionManager.run(async (client) => {
      const account = await this.repository.create(
        {
          organizationId,
          ownerUserId,
          type: TradingAccountType.DEMO,
          name: input.name.trim(),
          currency: input.currency.toUpperCase(),
          startingBalance: input.startingBalance,
          balance: input.startingBalance,
          leverage: input.leverage ?? 1,
        },
        client,
      );

      await this.repository.addLedgerEntry(
        {
          accountId: account.id,
          type: TradingLedgerEntryType.INITIAL_DEPOSIT,
          amount: input.startingBalance,
          balanceAfter: input.startingBalance,
          reference: "demo-account-created",
        },
        client,
      );

      return account;
    });
  }

  async listAccounts(
    organizationId: string,
    ownerUserId: string,
  ): Promise<TradingAccount[]> {
    return this.repository.findMany(
      organizationId,
      ownerUserId,
    );
  }

  async getAccount(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingAccount> {
    const account = await this.repository.findById(
      organizationId,
      ownerUserId,
      accountId,
    );

    if (!account) {
      throw new NotFoundException("Trading account not found");
    }

    return account;
  }

  async addVirtualFunds(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    amount: number,
  ): Promise<TradingAccount> {
    if (amount <= 0) {
      throw new BadRequestException(
        "Amount must be greater than zero",
      );
    }

    return this.transactionManager.run(async (client) => {
      const account = await this.repository.findById(
        organizationId,
        ownerUserId,
        accountId,
        client,
      );

      if (!account) {
        throw new NotFoundException(
          "Trading account not found",
        );
      }

      if (account.type !== TradingAccountType.DEMO) {
        throw new BadRequestException(
          "Virtual funds can only be added to Demo accounts",
        );
      }

      if (account.status !== TradingAccountStatus.ACTIVE) {
        throw new BadRequestException(
          "Trading account is not active",
        );
      }

      const nextBalance =
        Number(account.balance) + amount;

      const updated = await this.repository.updateBalance(
        organizationId,
        ownerUserId,
        accountId,
        nextBalance,
        TradingAccountStatus.ACTIVE,
        client,
      );

      await this.repository.addLedgerEntry(
        {
          accountId,
          type: TradingLedgerEntryType.VIRTUAL_DEPOSIT,
          amount,
          balanceAfter: nextBalance,
          reference: "virtual-funds-added",
        },
        client,
      );

      return updated;
    });
  }

  async resetDemoAccount(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingAccount> {
    return this.transactionManager.run(async (client) => {
      const account = await this.repository.findById(
        organizationId,
        ownerUserId,
        accountId,
        client,
      );

      if (!account) {
        throw new NotFoundException(
          "Trading account not found",
        );
      }

      if (account.type !== TradingAccountType.DEMO) {
        throw new BadRequestException(
          "Only Demo accounts can be reset",
        );
      }

      const startingBalance =
        Number(account.startingBalance ?? 0);

      const updated = await this.repository.updateBalance(
        organizationId,
        ownerUserId,
        accountId,
        startingBalance,
        TradingAccountStatus.ACTIVE,
        client,
      );

      await this.repository.addLedgerEntry(
        {
          accountId,
          type: TradingLedgerEntryType.RESET,
          amount:
            startingBalance -
            Number(account.balance),
          balanceAfter: startingBalance,
          reference: "demo-account-reset",
        },
        client,
      );

      return updated;
    });
  }

  async listLedger(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingLedgerEntry[]> {
    const account = await this.repository.findById(
      organizationId,
      ownerUserId,
      accountId,
    );

    if (!account) {
      throw new NotFoundException(
        "Trading account not found",
      );
    }

    return this.repository.listLedger(
      organizationId,
      ownerUserId,
      accountId,
    );
  }
}
