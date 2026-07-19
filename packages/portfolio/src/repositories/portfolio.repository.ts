import type { Portfolio } from "../entities/portfolio";
import type { Trade } from "../entities/trade";
import type { Equity } from "../entities/equity";

export interface PortfolioRepository {
  findById(id: string): Promise<Portfolio | null>;
  save(portfolio: Portfolio): Promise<void>;

  findTradesByPortfolio(portfolioId: string): Promise<Trade[]>;
  saveTrade(trade: Trade): Promise<void>;

  findEquityHistory(portfolioId: string, from: Date, to: Date): Promise<Equity[]>;
  saveEquityPoint(portfolioId: string, equity: Equity): Promise<void>;
}
