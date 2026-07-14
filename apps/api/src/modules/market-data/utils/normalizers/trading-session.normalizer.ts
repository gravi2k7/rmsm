import type { TradingSessionType } from "@rmsm/database";
import { requireField, normalizeCode } from "./mapping.utils";
import { InvalidTimestampError } from "../../validation/errors/market-data-validation.error";

export interface RawTradingSessionPayload {
  exchangeCode: string;
  type: TradingSessionType;
  openTime: string;
  closeTime: string;
  dayOfWeek?: number;
}

export interface NormalizedTradingSession {
  exchangeCode: string;
  type: TradingSessionType;
  openTime: string;
  closeTime: string;
  dayOfWeek: number | null;
}

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeTradingSession(raw: RawTradingSessionPayload): NormalizedTradingSession {
  const openTime = requireField(raw.openTime, "openTime", raw);
  const closeTime = requireField(raw.closeTime, "closeTime", raw);

  if (!TIME_OF_DAY_PATTERN.test(openTime)) {
    throw new InvalidTimestampError(`"${openTime}" is not a valid HH:mm time-of-day string.`, { field: "openTime", raw });
  }
  if (!TIME_OF_DAY_PATTERN.test(closeTime)) {
    throw new InvalidTimestampError(`"${closeTime}" is not a valid HH:mm time-of-day string.`, { field: "closeTime", raw });
  }
  if (raw.dayOfWeek !== undefined && (raw.dayOfWeek < 0 || raw.dayOfWeek > 6)) {
    throw new InvalidTimestampError(`dayOfWeek must be 0-6 (Sunday-Saturday); got ${raw.dayOfWeek}.`, { field: "dayOfWeek", raw });
  }

  return {
    exchangeCode: normalizeCode(raw.exchangeCode, "exchangeCode", raw),
    type: requireField(raw.type, "type", raw),
    openTime,
    closeTime,
    dayOfWeek: raw.dayOfWeek ?? null,
  };
}
