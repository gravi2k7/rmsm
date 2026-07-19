import { ok, type Result } from "@rmsm/core";
import { randomUUID } from "node:crypto";
import { SymbolCode, type Timeframe } from "@rmsm/market";
import { Strategy } from "../entities/strategy";
import { StrategyId } from "../value-objects/strategy-id";
import { RiskProfile, type RiskTolerance } from "../value-objects/risk-profile";
import type { StrategyTemplate } from "../entities/strategy-template";
import type { StrategyDomainError } from "../errors/strategy.errors";

export interface RawStrategyInput {
  readonly id?: string;
  readonly name: string;
  readonly description: string;
  readonly riskTolerance: RiskTolerance;
  readonly maxRiskPerTrade: number;
  readonly maxLeverage: number;
  readonly maxOpenPositions: number;
  readonly timeframe: Timeframe;
  readonly supportedSymbols: readonly string[];
}

/** Builds a `Strategy` from raw primitive input, or from a
 * `StrategyTemplate`'s own defaults — composing `StrategyId.create()`,
 * `RiskProfile.create()`, and every `SymbolCode.create()` call into one
 * aggregated `Result`, the same fail-fast composition pattern
 * `@rmsm/market`'s own `SymbolFactory` uses. */
export class StrategyFactory {
  static create(input: RawStrategyInput): Result<Strategy, StrategyDomainError> {
    const id = StrategyId.create(input.id ?? randomUUID());
    if (!id.ok) return id;

    const riskProfile = RiskProfile.create({
      tolerance: input.riskTolerance,
      maxRiskPerTrade: input.maxRiskPerTrade,
      maxLeverage: input.maxLeverage,
      maxOpenPositions: input.maxOpenPositions,
    });
    if (!riskProfile.ok) return riskProfile;

    const supportedSymbols: SymbolCode[] = [];
    for (const rawSymbol of input.supportedSymbols) {
      const symbolResult = SymbolCode.create(rawSymbol);
      if (!symbolResult.ok) return symbolResult;
      supportedSymbols.push(symbolResult.value);
    }

    const strategy = Strategy.create(id.value, {
      name: input.name,
      description: input.description,
      riskProfile: riskProfile.value,
      timeframe: input.timeframe,
      supportedSymbols,
    });

    return ok(strategy);
  }

  /** Creates a new `Strategy` seeded from a `StrategyTemplate`'s own
   * default risk profile — the template's own default rules/parameters
   * are attached separately via `StrategyService.addVersion()` (as a
   * real `StrategyVersion`), not baked into this call, since a fresh
   * strategy always starts with zero versions per `Strategy.create()`'s
   * own invariants. */
  static fromTemplate(
    template: StrategyTemplate,
    overrides: Pick<RawStrategyInput, "name" | "description" | "timeframe" | "supportedSymbols">,
  ): Result<Strategy, StrategyDomainError> {
    return StrategyFactory.create({
      name: overrides.name,
      description: overrides.description,
      riskTolerance: template.defaultRiskProfile.tolerance,
      maxRiskPerTrade: template.defaultRiskProfile.maxRiskPerTrade,
      maxLeverage: template.defaultRiskProfile.maxLeverage,
      maxOpenPositions: template.defaultRiskProfile.maxOpenPositions,
      timeframe: overrides.timeframe,
      supportedSymbols: overrides.supportedSymbols,
    });
  }
}
