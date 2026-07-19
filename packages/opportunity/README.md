# opportunity

The Opportunity Domain — trade opportunities generated from strategies: signal generation, signal
strength, confidence scoring, market context (trend/volatility/liquidity), and opportunity status
(Pending → Confirmed / Expired / Rejected).

_Pure domain package. No infrastructure: no Prisma, no database implementation, no REST, no
GraphQL, no broker integration. Signal generation is reached only through
`interfaces/signal-provider.interface.ts` — implemented entirely outside this package._

## Layout

```
src/
  entities/       Opportunity (aggregate root), Signal (aggregate root), MarketContext
  value-objects/  Confidence (0-100 score), SignalStrength (WEAK/MODERATE/STRONG + magnitude)
  events/         SignalGenerated, OpportunityCreated, OpportunityExpired
  repositories/   OpportunityRepository — persistence interface only
  services/       OpportunityService (lifecycle), ScoringService (composite scoring)
  interfaces/     SignalProvider — the signal-generation port
  validators/     Pure validation functions (favorable conditions, not expired)
  errors/         OpportunityDomainError hierarchy
  factories/      OpportunityFactory — builds a validated Opportunity (+ its Signal and
                   MarketContext) from raw input
  __tests__/      32 tests across value objects, entities, services, factory
```

## Design principles

- **Builds on `@rmsm/core`** and **`@rmsm/market`** (`SymbolCode`) — never on `@rmsm/strategy`
  directly. A `Signal`'s `sourceId` is a plain string reference to whatever generated it, not a
  live dependency — this domain doesn't need to know what a `Strategy` is to score an opportunity
  it produced.
- **Status lifecycle is intentionally simple**: `PENDING` is the only entry point, and
  `CONFIRMED`/`EXPIRED`/`REJECTED` are all terminal — an opportunity's outcome, once decided,
  doesn't change. `confirm()` reaching `CONFIRMED` means "this opportunity is real and still
  valid," not an execution decision — that's `@rmsm/decision`'s own, separate concern.
  `expire()` is distinct from `reject()`: expiry is a passive, time-based outcome, not an active
  human/system decision.
- **`ScoringService` blends confidence and signal strength equally**, then applies market context
  as a *multiplier* rather than a third additive component — unfavorable conditions should
  meaningfully discount an otherwise strong, confident signal, not just contribute one-third of
  the final number.
- **Result pattern at every construction boundary**; `Guard` for entity-internal invariants.

## Example

```ts
import { OpportunityFactory, OpportunityService, ScoringService } from "@rmsm/opportunity";

const result = OpportunityFactory.create({
  id: "opp-1", symbolCode: "EURUSD", strategyId: "strategy-1", signalId: "sig-1",
  direction: "BUY", signalMagnitude: 0.8, confidenceScore: 75,
  trend: "UP", volatility: "LOW", liquidity: "HIGH",
  createdAt: new Date(), expiresAt: new Date(Date.now() + 3600_000),
});

if (result.ok) {
  const scoring = new ScoringService();
  const score = scoring.score(result.value.confidence, result.value.signal.strength, result.value.marketContext);

  const service = new OpportunityService(opportunityRepository);
  await service.confirm(result.value.id);
}
```
