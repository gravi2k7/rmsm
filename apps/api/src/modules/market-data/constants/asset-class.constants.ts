import type { AssetClass } from "@rmsm/database";

/**
 * Static reference metadata per asset class — display names and a
 * default decimal precision hint (not enforced anywhere yet; a future
 * Instrument.tickSize value always wins when present, this is only a
 * fallback for asset classes/instruments that haven't set one). Pure
 * data, no logic — kept separate from candle-interval.constants.ts's
 * genuine function since mixing data-only exports with logic-bearing
 * ones in one file makes it harder to see at a glance which parts of
 * this module are "real code to test" vs. "reference data."
 */
export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  EQUITY: "Equity",
  ETF: "Exchange-Traded Fund",
  CRYPTO: "Cryptocurrency",
  FOREX: "Foreign Exchange",
  COMMODITY: "Commodity",
  INDEX: "Index",
  BOND: "Bond",
  OPTION: "Option",
  FUTURE: "Future",
};

export const DEFAULT_PRICE_DECIMAL_PLACES: Record<AssetClass, number> = {
  EQUITY: 2,
  ETF: 2,
  CRYPTO: 8,
  FOREX: 5,
  COMMODITY: 2,
  INDEX: 2,
  BOND: 3,
  OPTION: 2,
  FUTURE: 2,
};
