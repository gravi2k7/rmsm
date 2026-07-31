import { Injectable } from "@nestjs/common";
import type { BrokerSymbolService } from "../../interfaces/broker-symbol-service.interface";
import type { BrokerSymbolInfo } from "../../interfaces/broker-models";
import { MetaTrader5Client } from "./metatrader5.client";
import { MetaTrader5CacheService } from "./metatrader5.cache";
import type { Mt5SymbolResponse } from "./metatrader5.types";
import { MT5_SYMBOL_LIST_TTL_MULTIPLIER, MT5_SYMBOL_INFO_TTL_MULTIPLIER } from "./metatrader5.constants";

/** BR-001's Symbol Service section: Symbol List, Symbol Search, Symbol Information (Tick Size, Contract Size, Digits, Trading Sessions). Search is performed client-side against the (cached) full symbol list — MT5 gateways typically expose a bulk `/symbols` listing endpoint but no dedicated free-text search endpoint, and re-implementing search server-side per gateway vendor would be exactly the kind of vendor coupling BR-001's own note warns against. */
@Injectable()
export class MetaTrader5SymbolService implements BrokerSymbolService {
  constructor(
    private readonly client: MetaTrader5Client,
    private readonly cache: MetaTrader5CacheService,
    private readonly baseCacheTtlMs: number,
  ) {}

  async listSymbols(): Promise<BrokerSymbolInfo[]> {
    const raw = await this.cache.getOrSet("symbols", this.baseCacheTtlMs * MT5_SYMBOL_LIST_TTL_MULTIPLIER, () => this.client.request<Mt5SymbolResponse[]>("GET", "/symbols"));
    return raw.map((s) => this.toSymbolInfo(s));
  }

  async searchSymbols(query: string, limit = 10): Promise<BrokerSymbolInfo[]> {
    const all = await this.listSymbols();
    const normalizedQuery = query.toUpperCase();
    return all.filter((s) => s.symbol.toUpperCase().includes(normalizedQuery) || s.description?.toUpperCase().includes(normalizedQuery)).slice(0, limit);
  }

  async getSymbolInfo(symbol: string): Promise<BrokerSymbolInfo> {
    const raw = await this.cache.getOrSet(`symbol:${symbol}`, this.baseCacheTtlMs * MT5_SYMBOL_INFO_TTL_MULTIPLIER, () =>
      this.client.request<Mt5SymbolResponse>("GET", `/symbols/${encodeURIComponent(symbol)}`),
    );
    return this.toSymbolInfo(raw);
  }

  private toSymbolInfo(raw: Mt5SymbolResponse): BrokerSymbolInfo {
    return {
      symbol: raw.name,
      description: raw.description,
      digits: raw.digits,
      contractSize: raw.contractSize,
      tickSize: raw.tickSize,
      tradingSession: raw.tradeSessionName,
    };
  }
}
