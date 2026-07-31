import { Injectable } from "@nestjs/common";
import type { BrokerAccountService } from "../../interfaces/broker-account-service.interface";
import type { BrokerAccountInfo } from "../../interfaces/broker-models";
import { MetaTrader5Client } from "./metatrader5.client";
import { MetaTrader5CacheService } from "./metatrader5.cache";
import type { Mt5AccountResponse } from "./metatrader5.types";
import { MT5_ACCOUNT_INFO_TTL_MULTIPLIER } from "./metatrader5.constants";

/** BR-001's Account Service section, verbatim field list — see `BrokerAccountInfo`. */
@Injectable()
export class MetaTrader5AccountService implements BrokerAccountService {
  constructor(
    private readonly client: MetaTrader5Client,
    private readonly cache: MetaTrader5CacheService,
    private readonly baseCacheTtlMs: number,
  ) {}

  async getAccountInfo(): Promise<BrokerAccountInfo> {
    const raw = await this.cache.getOrSet("account", this.baseCacheTtlMs * MT5_ACCOUNT_INFO_TTL_MULTIPLIER, () => this.client.request<Mt5AccountResponse>("GET", "/account"));
    return this.toAccountInfo(raw);
  }

  private toAccountInfo(raw: Mt5AccountResponse): BrokerAccountInfo {
    return {
      accountNumber: raw.login,
      accountName: raw.name,
      balance: raw.balance,
      equity: raw.equity,
      margin: raw.margin,
      freeMargin: raw.marginFree,
      marginLevel: raw.marginLevel,
      currency: raw.currency,
      leverage: raw.leverage,
    };
  }
}
