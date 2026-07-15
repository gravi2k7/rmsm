import { Injectable, OnModuleInit } from "@nestjs/common";
import { IndicatorRegistryService } from "./indicator-registry.service";
import { TREND_DEFINITIONS, SUPERTREND_DEFINITION } from "../indicators/built-in/trend.definitions";
import { MOMENTUM_DEFINITIONS, MACD_DEFINITION } from "../indicators/built-in/momentum.definitions";
import { VOLATILITY_DEFINITIONS, KELTNER_CHANNEL_DEFINITION } from "../indicators/built-in/volatility.definitions";
import { VOLUME_DEFINITIONS } from "../indicators/built-in/volume.definitions";
import { PROPRIETARY_DEFINITIONS } from "../indicators/proprietary/proprietary.definitions";
import type { IndicatorDefinition } from "../contracts/indicator-definition.interface";

/**
 * Registers every definition this phase ships (item 10 + item 11's 28
 * named indicators, 30 total `IndicatorDefinition` objects counting
 * RDSE's 3 versions) at application startup — the same
 * `OnModuleInit`-driven registration shape as AI-101's own
 * `ProviderRegistrarService` (Phase 2B).
 *
 * **A real bug, caught by this module's own end-to-end test, not by
 * inspection**: an earlier version of this registrar registered whole
 * category files in file order (volatility, then trend, then
 * momentum...), on the assumption that category groupings and
 * dependency order would line up. They don't —
 * `keltner_channel` (volatility) depends on `ema` (trend), while
 * `supertrend` (trend) depends on `atr` (volatility): two indicators in
 * DIFFERENT category files, each needing something from the OTHER
 * file, with no actual cycle between the underlying indicators
 * themselves (`atr` and `ema` both have zero dependencies of their
 * own) — just a wrong assumption that file boundaries and dependency
 * order would coincide. `IndicatorDefinitionRegistrarService`'s own
 * test suite (`indicator-definition-registrar.service.spec.ts`)
 * exercises the REAL registrar end to end, not a mocked stand-in, which
 * is exactly why it caught this and a doc-comment claiming the ordering
 * was correct did not.
 *
 * Fixed by registering in true dependency order, explicitly, ignoring
 * category-file boundaries for ordering purposes:
 * 1. Every zero-dependency definition first (everything in each
 *    category array except the 3 indicators named individually below).
 * 2. Then the 3 built-in indicators with a real dependency:
 *    `supertrend` (needs `atr`), `macd` (needs `ema`), `keltner_channel`
 *    (needs `atr` AND `ema`) — all three satisfiable once step 1 is
 *    done, regardless of which category file they live in.
 * 3. Then proprietary, in `PROPRIETARY_DEFINITIONS`' own internal
 *    dependency order (unaffected by this bug — every proprietary
 *    dependency is itself also proprietary, so that array's own order
 *    was never file-boundary-crossing the way the built-in ones were).
 */
@Injectable()
export class IndicatorDefinitionRegistrarService implements OnModuleInit {
  constructor(private readonly registry: IndicatorRegistryService) {}

  onModuleInit(): void {
    const dependentIdentifiers = new Set([SUPERTREND_DEFINITION.identifier, MACD_DEFINITION.identifier, KELTNER_CHANNEL_DEFINITION.identifier]);
    const zeroDependencyBuiltIns: IndicatorDefinition[] = [
      ...VOLATILITY_DEFINITIONS,
      ...TREND_DEFINITIONS,
      ...MOMENTUM_DEFINITIONS,
      ...VOLUME_DEFINITIONS,
    ].filter((d) => !dependentIdentifiers.has(d.identifier));

    for (const definition of zeroDependencyBuiltIns) this.registry.register(definition);
    for (const definition of [SUPERTREND_DEFINITION, MACD_DEFINITION, KELTNER_CHANNEL_DEFINITION]) this.registry.register(definition);
    for (const definition of PROPRIETARY_DEFINITIONS) this.registry.register(definition);
  }
}
