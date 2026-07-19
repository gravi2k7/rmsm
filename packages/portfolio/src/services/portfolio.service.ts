import { ok, err, type Result, InvariantViolationError } from "@rmsm/core";
import type { PortfolioRepository } from "../repositories/portfolio.repository";
import type { PortfolioCalculator } from "../interfaces/portfolio-calculator.interface";
import { Portfolio } from "../entities/portfolio";
import { Position } from "../entities/position";
import { Trade } from "../entities/trade";
import { UnknownPortfolioError, InvalidPortfolioError, UnknownPositionError } from "../errors/portfolio.errors";
import { validateSufficientBuyingPower } from "../validators/portfolio.validator";

/**
 * Orchestrates `Portfolio` operations — depends on `PortfolioRepository`
 * (persistence) and `PortfolioCalculator` (live pricing), both
 * interfaces, constructor-injected. Never talks to a concrete database
 * or price feed directly.
 */
export class PortfolioService {
  constructor(
    private readonly portfolioRepository: PortfolioRepository,
    private readonly portfolioCalculator: PortfolioCalculator,
  ) {}

  async getById(id: string): Promise<Result<Portfolio, UnknownPortfolioError>> {
    const portfolio = await this.portfolioRepository.findById(id);
    if (!portfolio) return err(new UnknownPortfolioError(id));
    return ok(portfolio);
  }

  async openPosition(
    portfolioId: string,
    position: Position,
    marginRequired: number,
  ): Promise<Result<Portfolio, UnknownPortfolioError | InvalidPortfolioError>> {
    const portfolioResult = await this.getById(portfolioId);
    if (!portfolioResult.ok) return portfolioResult;
    const portfolio = portfolioResult.value;

    const marginCheck = validateSufficientBuyingPower(portfolio, marginRequired);
    if (!marginCheck.ok) return marginCheck;

    portfolio.openPosition(position, marginRequired);
    await this.portfolioRepository.save(portfolio);
    return ok(portfolio);
  }

  /** Closes a position at its own symbol's current market price (via
   * `PortfolioCalculator`), then persists both the updated `Portfolio`
   * and a new `Trade` record derived from the now-closed position — the
   * one place a `Trade` actually gets created, so `PerformanceService`
   * never has to reconstruct one itself from raw position data. */
  async closePosition(
    portfolioId: string,
    positionId: string,
    marginReleased: number,
  ): Promise<Result<{ portfolio: Portfolio; trade: Trade }, UnknownPortfolioError | UnknownPositionError>> {
    const portfolioResult = await this.getById(portfolioId);
    if (!portfolioResult.ok) return portfolioResult;
    const portfolio = portfolioResult.value;

    const position = portfolio.positions.find((p) => p.id === positionId);
    if (!position) return err(new UnknownPositionError(positionId));

    const currentPrice = await this.portfolioCalculator.getCurrentPrice(position.symbolCode);
    portfolio.closePosition(positionId, currentPrice, marginReleased);

    const trade = Trade.fromClosedPosition(`${positionId}-trade`, position);
    await this.portfolioRepository.save(portfolio);
    await this.portfolioRepository.saveTrade(trade);

    return ok({ portfolio, trade });
  }

  async deposit(portfolioId: string, amount: number): Promise<Result<Portfolio, UnknownPortfolioError>> {
    const portfolioResult = await this.getById(portfolioId);
    if (!portfolioResult.ok) return portfolioResult;

    const portfolio = portfolioResult.value;
    portfolio.deposit(amount);
    await this.portfolioRepository.save(portfolio);
    return ok(portfolio);
  }

  async withdraw(portfolioId: string, amount: number): Promise<Result<Portfolio, UnknownPortfolioError | InvalidPortfolioError>> {
    const portfolioResult = await this.getById(portfolioId);
    if (!portfolioResult.ok) return portfolioResult;

    const portfolio = portfolioResult.value;
    try {
      portfolio.withdraw(amount);
    } catch (error) {
      if (error instanceof InvalidPortfolioError) return err(error);
      if (error instanceof InvariantViolationError) return err(new InvalidPortfolioError(error.message));
      throw error;
    }
    await this.portfolioRepository.save(portfolio);
    return ok(portfolio);
  }

  /** The portfolio's own live equity right now — cash balance plus the
   * unrealized P&L of every open position at current market prices. */
  async getCurrentEquity(portfolioId: string): Promise<Result<number, UnknownPortfolioError>> {
    const portfolioResult = await this.getById(portfolioId);
    if (!portfolioResult.ok) return portfolioResult;
    const portfolio = portfolioResult.value;

    let unrealizedTotal = 0;
    for (const position of portfolio.openPositions) {
      const currentPrice = await this.portfolioCalculator.getCurrentPrice(position.symbolCode);
      unrealizedTotal += position.unrealizedPnlAt(currentPrice);
    }

    return ok(portfolio.cashBalance + unrealizedTotal);
  }
}
