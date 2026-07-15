import type { IntegerParameterDefinition, EnumParameterDefinition } from "../contracts/parameter-definition.interface";
import type { IndicatorTimeframe } from "../contracts/timeframe";

/**
 * Small, reusable builders for the parameter/timeframe shapes almost
 * every indicator definition below repeats — a "period" integer
 * parameter and a "source" price-field enum parameter cover the large
 * majority of the 28 definitions this phase registers. Extracted once
 * rather than repeated 20+ times, the same "avoid duplicated
 * normalization code" principle AI-101 Phase 2C's `mapping.utils.ts`
 * established, applied here to definition metadata instead.
 */

export function periodParameter(defaultValue: number, min = 1, max = 500): IntegerParameterDefinition {
  return { type: "integer", name: "period", required: true, defaultValue, min, max };
}

export function sourceParameter(defaultValue: "open" | "high" | "low" | "close" = "close"): EnumParameterDefinition {
  return { type: "enum", name: "source", required: true, defaultValue, allowedValues: ["open", "high", "low", "close"] };
}

/** Every AI-101 timeframe currently supported (excludes the 2m/3m/4m gap, AI102_PHASE1_ARCHITECTURE.md Section 5) — the default `supportedTimeframes` for any indicator with no genuine timeframe restriction of its own. */
export const ALL_SUPPORTED_TIMEFRAMES: IndicatorTimeframe[] = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
];
