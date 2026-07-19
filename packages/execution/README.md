# execution

The Execution Domain — the complete trade execution lifecycle after a decision has been
approved: order types (Market/Limit/Stop/Stop Limit), the full order lifecycle
(Pending → Submitted → Accepted → Partially Filled → Filled, or Cancelled/Rejected/Expired),
partial fills, average fill price, slippage, commission, retry policy, cancellation, and order
routing.

_Pure domain package. No infrastructure: no Prisma, no broker implementation, no MT5, no
TradingView, no REST, no GraphQL. Real broker connectivity and multi-venue routing decisions are
reached only through `interfaces/broker.interface.ts` and
`interfaces/execution-engine.interface.ts` — implemented entirely outside this package._

## Layout

```
src/
  entities/       Order (aggregate root), Fill, Execution (aggregate root), ExecutionPlan,
                   ExecutionSession
  value-objects/  OrderId, ExecutionId, Slippage, Commission — plus Price/Quantity, which
                   re-export @rmsm/market's own Price/Volume rather than duplicating them
  events/         OrderCreated, OrderSubmitted, OrderFilled, OrderPartiallyFilled,
                   OrderCancelled, ExecutionCompleted, ExecutionFailed
  repositories/   ExecutionRepository — persistence interface only
  services/       ExecutionService (fill polling + lifecycle), OrderRoutingService (plan → routed
                   orders), ExecutionValidatorService (pre-submission validation)
  interfaces/     Broker (one venue connection), ExecutionEngine (routing/venue-selection port)
  validators/     Pure validation functions (price requirements by order type, quantity bounds)
  errors/         ExecutionDomainError hierarchy
  factories/      ExecutionFactory — builds a validated Order from raw input
  __tests__/      56 tests across value objects, entities, services, factory
```

## Design principles

- **`Order` is the broker-facing lifecycle; `Execution` is this platform's own view of one
  attempt to fill it**, including retry bookkeeping (`canRetry()`/`recordRetry()` against a
  `maxRetries` budget) the venue itself has no concept of. The two are deliberately separate
  aggregates — a single `Order` could in principle be resubmitted under a fresh `Execution` after
  a failure.
- **`price.ts`/`quantity.ts` re-export `@rmsm/market`'s own `Price`/`Volume`** under this domain's
  own conventional names (order/fill prices and quantities are the same kind of thing as a market
  quote price and a traded volume) rather than duplicating that value-object logic, per this
  domain's own "depend on `@rmsm/market` where appropriate" rule.
- **`Order.applyFill()` rejects overfilling** — a fill that would push the cumulative filled
  quantity past the order's own `quantity` throws, rather than silently accepting bad data from
  a broker feed.
- **`Broker` (one venue) and `ExecutionEngine` (routing/venue-selection across possibly several)
  are two separate interfaces** — `OrderRoutingService` depends on both, since deciding *where*
  to route and actually *submitting* to a specific venue are genuinely different concerns.
- **Result pattern at every construction boundary**; `Guard` for entity-internal invariants.

## Example

```ts
import { ExecutionFactory, OrderRoutingService, ExecutionService } from "@rmsm/execution";

const orderResult = ExecutionFactory.createOrder({
  decisionId: "dec-1", symbolCode: "EURUSD", side: "BUY", type: "MARKET",
  quantityUnits: 10000, pricePrecision: 5,
});

if (orderResult.ok) {
  const routing = new OrderRoutingService(executionEngine, broker);
  // (an ExecutionPlan, not shown, would normally drive realizePlan())

  const execService = new ExecutionService(executionRepository, broker);
  await execService.pollAndApplyFills(executionId);
}
```
