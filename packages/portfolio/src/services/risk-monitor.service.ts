import type { PortfolioCalculator } from "../interfaces/portfolio-calculator.interface";
import { Portfolio } from "../entities/portfolio";
import { Exposure } from "../value-objects/exposure";
import { validateExposureWithinLimit } from "../validators/portfolio.validator";
import type { InvalidPortfolioError } from "../errors/portfolio.errors";
import type { Result } from "@rmsm/core";

/**
 * Computes exposure (by symbol, by sector, portfolio-wide) and monitors
 * drawdown against configured limits — depends on `PortfolioCalculator`
 * for live pricing, constructor-injected. Sector exposure needs a
 * symbol→sector mapping this domain has no source for (no market-data
 * dependency of that kind); a caller supplies one, this service doesn't
 * assume or hardcode sector data.
 *
 * `computeSymbolExposure`/`computeSectorExposure`/`computePortfolioExposure`
 * throw rather than returning a `Result` if `Exposure.create()` itself
 * fails — the only way that happens here is `currentEquity <= 0`, an
 * upstream-invariant violation (equity should never be non-positive by
 * the time risk monitoring runs) rather than an expected, branchable
 * outcome a caller of this service should be routing around.
 */
export class RiskMonitorService {
  constructor(private readonly portfolioCalculator: PortfolioCalculator) {}

  private async positionMarketValue(portfolio: Portfolio): Promise<Map<string, number>> {
    const values = new Map<string, number>();
    for (const position of portfolio.openPositions) {
      const price = await this.portfolioCalculator.getCurrentPrice(position.symbolCode);
      const value = position.quantityUnits * price;
      values.set(position.symbolCode.value, (values.get(position.symbolCode.value) ?? 0) + value);
    }
    return values;
  }

  async computeSymbolExposure(portfolio: Portfolio, symbolCode: string, currentEquity: number): Promise<Exposure> {
    const values = await this.positionMarketValue(portfolio);
    const amount = values.get(symbolCode) ?? 0;
    const result = Exposure.create({ scope: "SYMBOL", scopeId: symbolCode, amount, portfolioEquity: currentEquity });
    if (!result.ok) throw result.error;
    return result.value;
  }

  async computeSectorExposure(portfolio: Portfolio, sectorName: string, symbolsInSector: readonly string[], currentEquity: number): Promise<Exposure> {
    const values = await this.positionMarketValue(portfolio);
    const amount = symbolsInSector.reduce((sum, symbol) => sum + (values.get(symbol) ?? 0), 0);
    const result = Exposure.create({ scope: "SECTOR", scopeId: sectorName, amount, portfolioEquity: currentEquity });
    if (!result.ok) throw result.error;
    return result.value;
  }

  async computePortfolioExposure(portfolio: Portfolio, currentEquity: number): Promise<Exposure> {
    const values = await this.positionMarketValue(portfolio);
    const amount = Array.from(values.values()).reduce((sum, v) => sum + v, 0);
    const result = Exposure.create({ scope: "PORTFOLIO", amount, portfolioEquity: currentEquity });
    if (!result.ok) throw result.error;
    return result.value;
  }

  checkExposureLimit(exposure: Exposure, limitPercentage: number): Result<true, InvalidPortfolioError> {
    return validateExposureWithinLimit(exposure.percentage, limitPercentage);
  }

  /** Runs `Portfolio.checkDrawdown()` with the given current equity —
   * thin pass-through, kept here so a caller monitoring risk doesn't
   * need to import `Portfolio`'s own method directly alongside this
   * service's exposure checks. */
  checkDrawdownLimit(portfolio: Portfolio, currentEquity: number, limitPercentage: number): void {
    portfolio.checkDrawdown(currentEquity, limitPercentage);
  }
}
