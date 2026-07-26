export interface SymbolAttribution {
  readonly symbolCode: string;
  readonly realizedPnl: number;
  readonly tradeCount: number;
  readonly winRate: number;
}

export interface PerformanceAttribution {
  readonly portfolioId: string;
  readonly bySymbol: readonly SymbolAttribution[];
}
