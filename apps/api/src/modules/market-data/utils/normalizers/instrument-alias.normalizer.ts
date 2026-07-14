import { normalizeSymbol } from "./symbol.normalizer";
import { requireField } from "./mapping.utils";

export interface RawInstrumentAliasPayload {
  providerSymbol: string;
  providerId: string;
}

export interface NormalizedInstrumentAlias {
  providerSymbol: string;
  providerId: string;
}

/** Canonicalizes the provider's own symbol string format/casing only — resolving it to an actual instrumentId is InstrumentAliasRepository's job (a database lookup, out of scope for this side-effect-free normalizer, per symbol.normalizer.ts's own comment on pair-splitting). */
export function normalizeInstrumentAlias(raw: RawInstrumentAliasPayload): NormalizedInstrumentAlias {
  const { symbol } = normalizeSymbol(requireField(raw.providerSymbol, "providerSymbol", raw));
  return {
    providerSymbol: symbol,
    providerId: requireField(raw.providerId, "providerId", raw),
  };
}
