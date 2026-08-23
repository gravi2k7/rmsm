export const BINANCE_DEFAULT_BASE_URL = "https://api.binance.com";
export const BINANCE_DEFAULT_TIMEOUT_MS = 10_000;
export const BINANCE_DEFAULT_RETRY_COUNT = 2;
export const BINANCE_DEFAULT_RETRY_DELAY_MS = 250;
export const BINANCE_DEFAULT_REQUESTS_PER_MINUTE = 1200;

export const BINANCE_ASSET_CLASSES = ["CRYPTO"] as const;

export const BINANCE_INTERVAL_MAP = {
  ONE_MINUTE: "1m",
  FIVE_MINUTES: "5m",
  FIFTEEN_MINUTES: "15m",
  THIRTY_MINUTES: "30m",
  ONE_HOUR: "1h",
  FOUR_HOURS: "4h",
  ONE_DAY: "1d",
} as const;
