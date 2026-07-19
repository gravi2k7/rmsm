# strategy

The Strategy Domain — trading strategies modeled independently from execution: lifecycle
(Draft → Testing → Paper Trading → Production → Archived), versioning, parameters, rule
composition, risk profile, timeframe, supported symbols, enable/disable.

_Pure domain package. No infrastructure: no Prisma, no database implementation, no REST, no
GraphQL, no broker/MT5/TradingView integration. Rule evaluation is reached only through
`interfaces/strategy-engine.interface.ts` — implemented entirely outside this package._

## Layout

```
src/
  entities/       Strategy (aggregate root), StrategyVersion, StrategyRule,
                   StrategyParameter, StrategyTemplate
  value-objects/  StrategyId, ParameterValue, RiskProfile
  events/         StrategyCreated, StrategyUpdated, StrategyEnabled, StrategyDisabled
  repositories/   StrategyRepository — persistence interface only
  services/       StrategyService, StrategyValidatorService
  interfaces/     StrategyEngine — the execution-engine port
  validators/     Pure validation functions (entry rule presence, unique rule order)
  errors/         StrategyDomainError hierarchy, extending @rmsm/core's DomainError
  factories/      StrategyFactory — builds a validated Strategy from raw input or a template
  __tests__/      58 tests across value objects, entities, services, factory
```

## Design principles

- **Builds on `@rmsm/core`** (Entity/AggregateRoot/ValueObject/Result/DomainError/Guard) and
  **`@rmsm/market`** (`SymbolCode` for supported symbols, `Timeframe`) — never on anything
  execution- or infrastructure-specific.
- **Lifecycle is a strict, explicit state machine.** `Strategy.transitionTo()` only allows the
  transitions in its own `ALLOWED_TRANSITIONS` table — `DRAFT → TESTING → PAPER_TRADING →
  PRODUCTION → ARCHIVED`, with backward moves allowed at the early stages (real strategy
  development isn't strictly linear) and `ARCHIVED` terminal and reachable from anywhere.
- **`Strategy` uses a value-object id (`StrategyId`), not a raw string** — and overrides
  `Entity.equals()` to delegate to `StrategyId.equals()`, since the base `Entity` implementation's
  `Object.is()` comparison is reference equality, which is wrong once the id itself is a
  `ValueObject`.
- **Rule composition is intentionally lighter than AI-103's own Strategy Engine.** A
  `StrategyRule` holds a raw `expression` string and an `ENTRY`/`EXIT` kind — actual rule tree
  nesting/evaluation semantics belong to whatever implements `StrategyEngine`, not this domain.
- **Result pattern at every construction boundary**; `Guard` (throwing) for entity-internal
  invariants — the same split `@rmsm/market` documents.

## Example

```ts
import { StrategyFactory, StrategyService, StrategyValidatorService } from "@rmsm/strategy";

const result = StrategyFactory.create({
  name: "MA Crossover", description: "...",
  riskTolerance: "MEDIUM", maxRiskPerTrade: 0.02, maxLeverage: 10, maxOpenPositions: 5,
  timeframe: Timeframe.H1, supportedSymbols: ["EURUSD", "GBPUSD"],
});

if (result.ok) {
  const service = new StrategyService(strategyRepository, new StrategyValidatorService());
  await service.transitionStatus(result.value.id, "TESTING");
}
```
