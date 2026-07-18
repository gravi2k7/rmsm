# market

The Enterprise Market Domain — pure DDD domain modeling for market data across every supported
asset class: Forex, Futures, Equities, Indices, Crypto, Commodities, Options, Bonds, ETFs.

_Pure domain package. No infrastructure: no Prisma, no database implementation, no REST, no
GraphQL, no broker/MT5/TradingView integration. Persistence and external data needs are expressed
as interfaces only — concrete implementations live entirely outside this package._

## Layout

```
src/
  entities/        Exchange, MarketSymbol, Instrument, MarketSession, TradingCalendar,
                    TradingDay, MarketHoliday, Candle, Tick, Quote, TimeframeInfo
  value-objects/    SymbolCode, Price, Volume, CurrencyCode, Pip, TickSize, LotSize, Spread
  events/           MarketOpened, MarketClosed, SessionOpened, SessionClosed, TickReceived,
                    CandleOpened, CandleClosed, HolidayStarted
  repositories/     MarketRepository, SymbolRepository, ExchangeRepository, CalendarRepository
                    — persistence *interfaces* only
  services/         MarketService, CalendarService, SessionService, SymbolService
                    — domain services, constructor-injected with repository interfaces
  interfaces/       MarketDataProvider, MarketCalendarProvider, MarketSessionProvider
                    — external-data-source ports
  types/            AssetClass, InstrumentType, MarketStatus, ExchangeType, SessionType
  enums/            Timeframe, Currency
  validators/       Cross-field validation functions (symbol, price)
  errors/           MarketDomainError hierarchy, extending @rmsm/core's DomainError
  factories/        SymbolFactory, CandleFactory — build validated entities from raw input
  __tests__/        127 tests across entities, value objects, services, validators, factories
```

## Design principles

- **Builds on `@rmsm/core`**: `Entity`/`AggregateRoot` for identity and domain events,
  `ValueObject` for immutable value types, `Result`/`ok`/`err` for explicit, non-throwing
  construction-time error handling, `DomainError` as the base of `MarketDomainError`, `Guard` for
  invariant checks.
- **Dependency inversion throughout.** Every domain service depends on a repository/provider
  *interface*, injected via its constructor — never on a concrete implementation. A real
  Postgres-backed `MarketRepository`, or a real broker SDK implementing `MarketDataProvider`,
  lives entirely outside this package.
- **Result pattern at every construction boundary.** Value objects and factories return
  `Result<T, MarketDomainError>` rather than throwing on invalid input — entities use `Guard`
  (throwing) for their own construction-time invariants, matching `@rmsm/core`'s own convention
  that `Guard`/`InvariantViolationError` is for "this object must not exist in an invalid state,"
  while `Result` is for input a caller is expected to branch on.
- **Aggregate roots raise events only for real state transitions.** Opening an already-open
  `Exchange`, or completing an already-complete `Candle`, is a no-op — not a duplicate event.

## Example

```ts
import { SymbolFactory, CandleFactory, MarketService, Timeframe } from "@rmsm/market";

const symbolResult = SymbolFactory.create({
  id: "sym-1", code: "EURUSD", description: "Euro vs US Dollar",
  baseCurrency: "EUR", quoteCurrency: "USD",
  tickSize: 0.00001, pointValue: 10, lotSizeUnits: 100_000, contractSize: 100_000,
  minVolume: 0.01, maxVolume: 100, precision: 5,
  exchangeId: "ex-forex", assetClass: "FOREX", instrumentType: "SPOT",
});

if (symbolResult.ok) {
  console.log(symbolResult.value.code.value); // "EURUSD"
}

// MarketService takes injected repository interfaces — a real app supplies
// its own Postgres/whatever-backed implementations.
const marketService = new MarketService(exchangeRepository, calendarService);
const status = await marketService.getStatus("ex-forex");
```
