import { Injectable } from "@nestjs/common";
import { IndicatorNotFoundException } from "../contracts/execution.errors";
import type { Indicator } from "../contracts/indicator.interface";
import type { IndicatorFactory as IndicatorFactoryContract } from "../contracts/indicator-factory.interface";

/**
 * Real implementation of Phase 1's `IndicatorFactory` contract — the
 * same Map-based, no-switch-statement dispatch shape as every other
 * factory in this project (AI-101 Phase 2B's `ProviderFactoryService`
 * being the most direct precedent). **Genuinely empty this phase**: no
 * `registerBuilder()` call anywhere registers a real `calculate()`
 * implementation, because none exist yet (EMA, RSI, MACD, ATR, RDSE —
 * every real indicator's actual calculation logic — are explicitly
 * deferred past Phase 2B). `ComputationEngineService` calls
 * `factory.create()` as part of its real, complete pipeline; for every
 * one of the 28 definitions Phase 2A registered, that call will throw
 * `IndicatorNotFoundException` — the honest, correct outcome given
 * reality (no calculation exists to invoke), not a bug this phase needs
 * to work around. Verified by a real test
 * (`computation-engine.service.spec.ts`) asserting this exact failure
 * mode is what actually happens, not silently accepted as an untested
 * assumption.
 */
@Injectable()
export class IndicatorFactoryService implements IndicatorFactoryContract {
  private readonly builders = new Map<string, (parameters: Record<string, number | string | boolean>) => Indicator>();

  registerBuilder(identifier: string, build: (parameters: Record<string, number | string | boolean>) => Indicator): void {
    this.builders.set(identifier, build);
  }

  create(identifier: string, parameters: Record<string, number | string | boolean>): Indicator {
    const builder = this.builders.get(identifier);
    if (!builder) {
      throw new IndicatorNotFoundException(
        `No calculation implementation is registered for indicator "${identifier}" — its definition exists in the registry (Phase 2A), but no Indicator.calculate() implementation has been built for it yet (deferred past Phase 2B).`,
        { identifier },
      );
    }
    return builder(parameters);
  }
}
