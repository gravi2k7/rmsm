# decision

The Decision Domain — risk validation before execution: Maximum Daily Loss, Maximum Position
Size, Exposure Limits, Correlation Check, Margin Check, an approval workflow
(Pending → Approved / Rejected / Manual Review), and position size calculation.

_Pure domain package. No infrastructure: no Prisma, no database implementation, no REST, no
GraphQL, no broker integration. Real account/exposure/correlation data is reached only through
`interfaces/risk-engine.interface.ts` — implemented entirely outside this package._

## Layout

```
src/
  entities/       Decision (aggregate root), Approval, RiskAssessment, PositionSize
  value-objects/  RiskScore (0-100, higher = worse), ApprovalStatus
  events/         DecisionApproved, DecisionRejected
  repositories/   DecisionRepository — persistence interface only
  services/       DecisionService (approval workflow), RiskService (risk checks + sizing)
  interfaces/     RiskEngine — the account/exposure/correlation data port
  validators/     Pure validation functions (risk assessment passed, position size within risk)
  errors/         DecisionDomainError hierarchy
  factories/      DecisionFactory — builds a Decision from an already-computed
                   RiskAssessment + PositionSize
  __tests__/      37 tests across value objects, entities, services, factory
```

## Design principles

- **Builds on `@rmsm/core`** and **`@rmsm/market`** (`SymbolCode`) — references
  `@rmsm/opportunity`'s own opportunity only by id (`Decision.opportunityId`), never as a live
  dependency.
- **`RiskAssessment` records five real, independent checks** — the exact five this domain is
  required to support — not one opaque pass/fail boolean, so a rejected/manually-reviewed decision
  can show which check(s) actually failed.
- **`DecisionService.approve()` enforces `RiskAssessment.passed()` before ever calling
  `Decision.approve()`** — the aggregate method itself doesn't re-check this (an aggregate
  shouldn't silently veto its own caller), so a bug that skips the service-layer check is a real,
  loud test failure rather than a quiet no-op deep in the entity.
- **`RiskScore` is inverted from `@rmsm/opportunity`'s `Confidence`** — higher risk score is
  worse, higher confidence is better — deliberately, since conflating the two conventions would
  invite sign errors at any call site touching both packages.
- **Workflow**: `PENDING → APPROVED / REJECTED / MANUAL_REVIEW`, and `MANUAL_REVIEW → APPROVED /
  REJECTED` — `APPROVED`/`REJECTED` are both terminal.

## Example

```ts
import { RiskService, DecisionService, DecisionFactory } from "@rmsm/decision";

const riskService = new RiskService(riskEngine);
const assessment = await riskService.assess(symbolCode, 0.01, {
  maxDailyLossFraction: 0.05, maxPositionSizeFraction: 0.02,
  maxExposureFraction: 0.1, maxCorrelation: 0.7, minMarginBufferFraction: 0.2,
});
const sizeResult = await riskService.calculatePositionSize(symbolCode, 0.02, 0.005);

if (sizeResult.ok) {
  const decisionResult = DecisionFactory.create({
    opportunityId: "opp-1", riskAssessment: assessment, positionSize: sizeResult.value,
  });

  if (decisionResult.ok) {
    const decisionService = new DecisionService(decisionRepository);
    await decisionService.approve(decisionResult.value.id, "risk-officer-1");
  }
}
```
