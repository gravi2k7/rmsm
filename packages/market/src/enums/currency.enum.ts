/** ISO 4217 major currencies plus the handful of crypto "currencies" that
 * appear as the base/quote leg of a `CRYPTO`-asset-class `Symbol` (e.g.
 * `BTCUSD`'s base leg is `BTC`, not an ISO 4217 code — crypto has no ISO
 * 4217 entry, so this enum extends beyond ISO 4217 deliberately rather
 * than being unable to represent half of this domain's own required
 * asset classes). Not exhaustive of either fiat or crypto — extend as
 * real trading pairs require it. */
export enum Currency {
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
  JPY = "JPY",
  CHF = "CHF",
  CAD = "CAD",
  AUD = "AUD",
  NZD = "NZD",
  CNY = "CNY",
  HKD = "HKD",
  SGD = "SGD",
  BTC = "BTC",
  ETH = "ETH",
  USDT = "USDT",
}

/** Fiat currencies conventionally quoted to 2 decimal places for cash
 * amounts (not to be confused with a `Symbol`'s own `precision`, which
 * governs price quoting, not currency-amount display) default to 2;
 * `JPY` (no minor unit) defaults to 0. Crypto currencies aren't listed —
 * their conventional display precision varies far more by context than
 * a fixed per-currency constant can usefully capture. */
export const FIAT_MINOR_UNIT_DIGITS: Readonly<Partial<Record<Currency, number>>> = {
  [Currency.USD]: 2,
  [Currency.EUR]: 2,
  [Currency.GBP]: 2,
  [Currency.JPY]: 0,
  [Currency.CHF]: 2,
  [Currency.CAD]: 2,
  [Currency.AUD]: 2,
  [Currency.NZD]: 2,
  [Currency.CNY]: 2,
  [Currency.HKD]: 2,
  [Currency.SGD]: 2,
};
