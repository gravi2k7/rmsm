import { Injectable } from "@nestjs/common";
import type { PortfolioRepository, Portfolio, Trade, Equity } from "@rmsm/portfolio";

/**
 * In-memory `PortfolioRepository`. Implements only the interface's own
 * methods, matching the same "no extra methods" discipline as the other
 * five in-memory adapters (see `strategy.memory-repository.ts`'s own
 * doc comment) — with one honestly-documented limitation this reveals:
 * `PortfolioRepository.saveTrade(trade)` takes no `portfolioId`, and
 * `@rmsm/portfolio`'s own `Trade` entity carries no portfolio
 * association either — the domain interface's own design assumes that
 * mapping is established some other way a real (e.g. relational,
 * foreign-key-backed) implementation would have, which a flat in-memory
 * `Map` genuinely can't reconstruct from `saveTrade()`'s own single
 * argument. `findTradesByPortfolio()` here returns every stored trade
 * regardless of the given `portfolioId` — correct for this phase's own
 * single-portfolio usage, and flagged in PERSISTENCE_ROADMAP.md as
 * something a real implementation needs a schema-level fix for (a
 * `portfolioId` foreign key on the trades table), not something to
 * silently paper over.
 */
@Injectable()
export class InMemoryPortfolioRepository implements PortfolioRepository {
  private readonly portfolios = new Map<string, Portfolio>();
  private readonly trades: Trade[] = [];
  private readonly equityByPortfolio = new Map<string, Equity[]>();

  async findById(id: string): Promise<Portfolio | null> {
    return this.portfolios.get(id) ?? null;
  }

  async save(portfolio: Portfolio): Promise<void> {
    this.portfolios.set(portfolio.id, portfolio);
  }

  async findTradesByPortfolio(_portfolioId: string): Promise<Trade[]> {
    return [...this.trades];
  }

  async saveTrade(trade: Trade): Promise<void> {
    this.trades.push(trade);
  }

  async findEquityHistory(portfolioId: string, from: Date, to: Date): Promise<Equity[]> {
    const all = this.equityByPortfolio.get(portfolioId) ?? [];
    return all.filter((e) => e.recordedAt.getTime() >= from.getTime() && e.recordedAt.getTime() <= to.getTime());
  }

  async saveEquityPoint(portfolioId: string, equity: Equity): Promise<void> {
    const existing = this.equityByPortfolio.get(portfolioId) ?? [];
    this.equityByPortfolio.set(portfolioId, [...existing, equity]);
  }
}
