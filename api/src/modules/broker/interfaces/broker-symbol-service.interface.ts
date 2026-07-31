import type { BrokerSymbolInfo } from "./broker-models";

/** BR-001's Symbol Service section: Symbol List, Symbol Search, Symbol Information (Tick Size, Contract Size, Digits, Trading Sessions — all fields on `BrokerSymbolInfo`). */
export interface BrokerSymbolService {
  listSymbols(): Promise<BrokerSymbolInfo[]>;
  searchSymbols(query: string, limit?: number): Promise<BrokerSymbolInfo[]>;
  getSymbolInfo(symbol: string): Promise<BrokerSymbolInfo>;
}
