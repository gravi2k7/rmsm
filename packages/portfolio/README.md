# portfolio

The Portfolio Domain — portfolio state after trades are executed: cash balance, equity, buying
power, margin used/available, positions (open/closed, long/short), performance
(realized/unrealized P&L, win rate, profit factor, Sharpe ratio, maximum drawdown), and risk
(symbol exposure, sector exposure, maximum portfolio risk).

_Pure domain package. No infrastructure: no Prisma, no REST, no GraphQL. Live pricing is reached
only through `interfaces/portfolio-calculator.interface.ts` — implemented entirely outside this
package._

## Layout

```
src/
  entities/       Portfolio (aggregate root), Position, Holding, Trade, Balance, Equity
  value-objects/  PortfolioId, PnL, Drawdown, Exposure
  events/         PortfolioCreated, PositionOpened, PositionClosed, PortfolioUpdated,
                   DrawdownLimit
  repositories/   PortfolioRepository — persistence interface only
  services/       PortfolioService (open/close positions, deposits/withdrawals, live equity),
                   PerformanceService (win rate, profit factor, Sharpe ratio, max drawdown),
                   RiskMonitorService (symbol/sector/portfolio exposure, drawdown limits)
  interfaces/     PortfolioCalculator — the live-pricing port
  validators/     Pure validation functions (buying power, exposure limits)
  errors/         PortfolioDomainError hierarchy
  factories/      PortfolioFactory — builds a validated Portfolio or Position from raw input
  __tests__/      63 tests across value objects, entities, services, factory
```

## Design principles

- **Builds on `@rmsm/core`** and **`@rmsm/market`** (`SymbolCode`) — never on `@rmsm/execution`
  directly; a closed `Position`'s own exit price comes from `PortfolioCalculator` (live pricing),
  not from reading an `Order`'s own fills.
- **`buyingPower`/`marginAvailable` are computed, not stored** — derived from `cashBalance` minus
  `marginUsed` every time, so they can never drift out of sync with the numbers that actually
  determine them.
- **Every deposit, withdrawal, and realized P&L is a `Balance` ledger entry**, not just a mutation
  of a bare number — `Portfolio.cashBalance` is always reconstructable/auditable from its own
  entry history.
- **`Portfolio.checkDrawdown()` (live, running-peak comparison) and `PerformanceService.maxDrawdown()`
  (worst historical peak-to-trough decline across an entire equity curve) are deliberately two
  different calculations** answering two different questions — "is a limit being breached right
  now" vs. "what was the worst this portfolio ever experienced."
- **A `Trade` is only ever built from an already-closed `Position`** (`Trade.fromClosedPosition()`
  throws if the position isn't fully closed) — no separate, independently-maintained trade log
  that could drift from position history.
- **Result pattern at every construction boundary**, including converting `@rmsm/core`'s own
  `Guard`-thrown `InvariantViolationError` into this package's `InvalidPortfolioError` inside
  every factory/service that wraps an entity's throwing constructor — a real bug caught during
  testing (a negative initial balance was propagating as an uncaught exception instead of a clean
  `Result`), fixed rather than tested around.

## Example

```ts
import { PortfolioFactory, PortfolioService, PerformanceService, RiskMonitorService } from "@rmsm/portfolio";

const portfolioResult = PortfolioFactory.createPortfolio({ initialCashBalance: 10000 });

if (portfolioResult.ok) {
  const portfolioService = new PortfolioService(portfolioRepository, portfolioCalculator);
  const positionResult = PortfolioFactory.createPosition({
    symbolCode: "EURUSD", side: "LONG", quantityUnits: 1000, entryPrice: 1.1,
  });

  if (positionResult.ok) {
    await portfolioService.openPosition(portfolioResult.value.id, positionResult.value, 500);
  }

  const riskMonitor = new RiskMonitorService(portfolioCalculator);
  const performance = new PerformanceService();
}
```
