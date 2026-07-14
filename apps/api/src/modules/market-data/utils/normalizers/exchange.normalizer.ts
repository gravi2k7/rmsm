import type { NormalizedExchangeInfo } from "../../interfaces/reference-data-provider.interface";
import { normalizeCode, requireField, optionalField } from "./mapping.utils";
import { InvalidTimezoneError } from "../../validation/errors/market-data-validation.error";

export interface RawExchangePayload {
  code: string;
  name: string;
  timezone: string;
  country?: string;
}

export function normalizeExchange(raw: RawExchangePayload): NormalizedExchangeInfo {
  const timezone = requireField(raw.timezone, "timezone", raw);
  try {
    // eslint-disable-next-line no-new -- validates the IANA zone; throws RangeError if invalid
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new InvalidTimezoneError(`"${timezone}" is not a valid IANA timezone identifier.`, { raw });
  }

  return {
    code: normalizeCode(raw.code, "code", raw),
    name: requireField(raw.name, "name", raw).trim(),
    timezone,
    country: optionalField(raw.country)?.trim().toUpperCase() ?? undefined,
  };
}
