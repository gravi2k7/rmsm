import { InvalidSymbolError } from "../../validation/errors/market-data-validation.error";

export type SymbolFormat = "exchange_prefixed" | "slash_pair" | "plain";

export interface NormalizedSymbol {
  raw: string;
  /** From "EXCHANGE:SYMBOL" notation — null when the input carries no exchange hint. */
  exchangeHint: string | null;
  /** Uppercased, whitespace-stripped. For slash_pair format, this is `BASE-USD`-style (slash replaced with hyphen) rather than the base/quote split alone, so every format still has one single canonical symbol string to compare/store. */
  symbol: string;
  /** Populated only when format === "slash_pair", where the delimiter makes the split unambiguous. */
  baseCurrency?: string;
  quoteCurrency?: string;
  format: SymbolFormat;
}

/**
 * Canonicalizes symbol string FORMAT and casing — deliberately does NOT
 * attempt to split a concatenated pair like "BTCUSDT" into "BTC"+"USDT".
 * Doing that correctly requires a dictionary of known quote currencies
 * (is it BTC/USDT or BTCU/SDT?) — real reference data, which this
 * normalizer cannot consult (Phase 2C's explicit "no database access, no
 * network access" rule). "BTCUSDT" normalizes to format: "plain" with
 * `symbol: "BTCUSDT"` unchanged in substance, exactly like "AAPL" does.
 * Resolving an ambiguous provider symbol string to a canonical
 * `Instrument` is `InstrumentAlias`'s job (Phase 2A) — a real, stored
 * mapping an admin or sync process populates once per provider/symbol,
 * not something a pure function can safely guess. Flagged here as a
 * genuine, permanent limitation of pure-function normalization, not
 * something a later phase is expected to "fix" — the fix is
 * `InstrumentAlias`, which already exists.
 */
export function normalizeSymbol(input: string): NormalizedSymbol {
  const raw = input;
  const trimmed = input.trim();
  if (!trimmed) {
    throw new InvalidSymbolError("Symbol cannot be empty.", { input });
  }

  if (trimmed.includes(":")) {
    const [exchangeHint, ...rest] = trimmed.split(":");
    const symbolPart = rest.join(":").trim();
    if (!exchangeHint || !symbolPart) {
      throw new InvalidSymbolError(`"${input}" has an "EXCHANGE:SYMBOL" separator but is missing one side.`, { input });
    }
    return {
      raw,
      exchangeHint: exchangeHint.trim().toUpperCase(),
      symbol: symbolPart.toUpperCase().replace(/\s+/g, ""),
      format: "exchange_prefixed",
    };
  }

  if (trimmed.includes("/")) {
    const [base, quote] = trimmed.split("/");
    if (!base?.trim() || !quote?.trim()) {
      throw new InvalidSymbolError(`"${input}" has a "BASE/QUOTE" separator but is missing one side.`, { input });
    }
    const baseCurrency = base.trim().toUpperCase();
    const quoteCurrency = quote.trim().toUpperCase();
    return {
      raw,
      exchangeHint: null,
      symbol: `${baseCurrency}-${quoteCurrency}`,
      baseCurrency,
      quoteCurrency,
      format: "slash_pair",
    };
  }

  return {
    raw,
    exchangeHint: null,
    symbol: trimmed.toUpperCase().replace(/\s+/g, ""),
    format: "plain",
  };
}
