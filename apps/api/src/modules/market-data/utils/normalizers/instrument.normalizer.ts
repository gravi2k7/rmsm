import type { AssetClass } from "@rmsm/database";
import type { NormalizedInstrumentReference } from "../../interfaces/reference-data-provider.interface";
import { normalizeSymbol } from "./symbol.normalizer";
import { normalizeCode, requireField, optionalField } from "./mapping.utils";

export interface RawInstrumentPayload {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  exchangeCode?: string;
  isin?: string;
  cusip?: string;
}

export function normalizeInstrument(raw: RawInstrumentPayload): NormalizedInstrumentReference {
  const { symbol, exchangeHint } = normalizeSymbol(requireField(raw.symbol, "symbol", raw));

  return {
    providerSymbol: symbol,
    name: requireField(raw.name, "name", raw).trim(),
    assetClass: requireField(raw.assetClass, "assetClass", raw),
    currency: normalizeCode(raw.currency, "currency", raw),
    exchangeCode: raw.exchangeCode ? normalizeCode(raw.exchangeCode, "exchangeCode", raw) : (exchangeHint ?? undefined),
    isin: optionalField(raw.isin)?.trim().toUpperCase() ?? undefined,
    cusip: optionalField(raw.cusip)?.trim().toUpperCase() ?? undefined,
  };
}
