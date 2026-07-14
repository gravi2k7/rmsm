import type { CorporateActionType } from "@rmsm/database";
import type { NormalizedCorporateAction } from "../../interfaces/corporate-action-provider.interface";
import { normalizeDecimal } from "./decimal.normalizer";
import { normalizeTimestamp } from "./time.normalizer";
import { normalizeSymbol } from "./symbol.normalizer";
import { requireField } from "./mapping.utils";

export interface RawCorporateActionPayload {
  symbol: string;
  type: CorporateActionType;
  effectiveDate: string | number;
  value: string | number;
  announcedAt?: string | number;
}

const VALUE_SCALE = 10;

export function normalizeCorporateAction(raw: RawCorporateActionPayload): NormalizedCorporateAction {
  const { symbol } = normalizeSymbol(requireField(raw.symbol, "symbol", raw));

  return {
    providerSymbol: symbol,
    type: requireField(raw.type, "type", raw),
    effectiveDate: normalizeTimestamp(requireField(raw.effectiveDate, "effectiveDate", raw), true), // corporate actions are often announced/effective in the future
    value: normalizeDecimal(requireField(raw.value, "value", raw), { maxScale: VALUE_SCALE }),
    announcedAt: raw.announcedAt !== undefined ? normalizeTimestamp(raw.announcedAt, true) : undefined,
  };
}
