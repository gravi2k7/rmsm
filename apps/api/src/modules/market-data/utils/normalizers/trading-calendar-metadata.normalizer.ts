import { normalizeCode, requireField } from "./mapping.utils";
import { InvalidProviderPayloadError } from "../../validation/errors/market-data-validation.error";

/**
 * Normalizes METADATA describing a provider's trading-calendar data
 * coverage — NOT actual holiday dates (holiday calendars are explicitly
 * deferred, ADR-024). This is the shape a future `TradingHoliday`/
 * `TradingCalendar`/`SpecialTradingDay` ingestion phase would use to
 * describe what it's about to import ("this provider's calendar data for
 * NYSE covers 2020-2030, includes half-days") before any actual holiday
 * row is written — genuinely useful now, even with zero holiday rows to
 * attach it to yet, since it's a real, self-contained piece of
 * information a provider payload can carry independent of whether the
 * consuming feature exists.
 */
export interface RawTradingCalendarMetadataPayload {
  exchangeCode: string;
  coverageStartYear: number;
  coverageEndYear: number;
  includesHalfDays?: boolean;
}

export interface NormalizedTradingCalendarMetadata {
  exchangeCode: string;
  coverageStartYear: number;
  coverageEndYear: number;
  includesHalfDays: boolean;
}

export function normalizeTradingCalendarMetadata(raw: RawTradingCalendarMetadataPayload): NormalizedTradingCalendarMetadata {
  const start = requireField(raw.coverageStartYear, "coverageStartYear", raw);
  const end = requireField(raw.coverageEndYear, "coverageEndYear", raw);
  if (end < start) {
    throw new InvalidProviderPayloadError(`coverageEndYear (${end}) cannot be before coverageStartYear (${start}).`, { raw });
  }

  return {
    exchangeCode: normalizeCode(raw.exchangeCode, "exchangeCode", raw),
    coverageStartYear: start,
    coverageEndYear: end,
    includesHalfDays: raw.includesHalfDays ?? false,
  };
}
