import type { NormalizedCandle, NormalizedQuote, NormalizedTick } from "../interfaces/normalized-market-data.interface";

export interface DuplicateFinding<T> {
  item: T;
  duplicateOf: T;
  index: number;
  duplicateOfIndex: number;
}

/**
 * Reusable duplicate-detection utilities — infrastructure only, no
 * database (Phase 2C's explicit "no database implementation" for this
 * item). Operates entirely on an in-memory batch; detecting a duplicate
 * against already-persisted rows is the repository layer's job (Phase
 * 2A's `MarketCandle` unique constraint is the real, final duplicate
 * defense — this utility is the same "catch it earlier and cheaper, not
 * a replacement for the database's own guarantee" reasoning as
 * `reference-data.validator.ts`'s uniqueness check).
 *
 * One generic core function (`detectDuplicatesBy`) with three thin,
 * named wrappers — avoids writing the same batch-scanning loop three
 * times (Phase 2C's own "avoid duplicated normalization code" principle,
 * applied to validation code too).
 */
function detectDuplicatesBy<T>(items: T[], keyFn: (item: T) => string): DuplicateFinding<T>[] {
  const findings: DuplicateFinding<T>[] = [];
  const seen = new Map<string, { item: T; index: number }>();

  items.forEach((item, index) => {
    const key = keyFn(item);
    const existing = seen.get(key);
    if (existing) {
      findings.push({ item, duplicateOf: existing.item, index, duplicateOfIndex: existing.index });
    } else {
      seen.set(key, { item, index });
    }
  });

  return findings;
}

/** Candle identity for duplicate purposes: (providerSymbol, interval, eventTime) — deliberately NOT including `source`, unlike the database's own unique constraint (Phase 2A), which does include it. This detector runs on ONE provider's OWN batch before persistence, where every row shares the same source by construction; the database constraint is the one that needs to allow a LIVE row and a HISTORICAL_IMPORT row to coexist for the same (symbol, interval, time). */
export function detectCandleDuplicates(candles: NormalizedCandle[]): DuplicateFinding<NormalizedCandle>[] {
  return detectDuplicatesBy(candles, (c) => `${c.providerSymbol}|${c.interval}|${c.eventTime.getTime()}`);
}

export function detectTickDuplicates(ticks: NormalizedTick[]): DuplicateFinding<NormalizedTick>[] {
  return detectDuplicatesBy(ticks, (t) => `${t.providerSymbol}|${t.eventTime.getTime()}|${t.price}|${t.size}`);
}

export function detectQuoteDuplicates(quotes: NormalizedQuote[]): DuplicateFinding<NormalizedQuote>[] {
  return detectDuplicatesBy(quotes, (q) => `${q.providerSymbol}|${q.eventTime.getTime()}`);
}
