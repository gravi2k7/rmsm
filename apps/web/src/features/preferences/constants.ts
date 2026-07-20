import type { CandleInterval, AssetClass } from "@/features/market/types";

export const CANDLE_INTERVALS: { value: CandleInterval; label: string }[] = [
  { value: "ONE_MINUTE", label: "1 minute" },
  { value: "FIVE_MINUTES", label: "5 minutes" },
  { value: "FIFTEEN_MINUTES", label: "15 minutes" },
  { value: "THIRTY_MINUTES", label: "30 minutes" },
  { value: "ONE_HOUR", label: "1 hour" },
  { value: "FOUR_HOURS", label: "4 hours" },
  { value: "ONE_DAY", label: "1 day" },
  { value: "ONE_WEEK", label: "1 week" },
];

export const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: "FOREX", label: "Forex" },
  { value: "EQUITY", label: "Stocks" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "INDEX", label: "Indices" },
  { value: "COMMODITY", label: "Commodities" },
];
