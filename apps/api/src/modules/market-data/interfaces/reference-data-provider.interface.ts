import type { AssetClass } from "@rmsm/database";

export interface NormalizedExchangeInfo {
  code: string;
  name: string;
  timezone: string;
  country?: string;
}

export interface NormalizedInstrumentReference {
  providerSymbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  exchangeCode?: string;
  isin?: string;
  cusip?: string;
}

/** Bulk/catalog-style reference data — "give me everything you know about your universe of tradable instruments and the exchanges they're on" — distinct from InstrumentProvider (interfaces/instrument-provider.interface.ts), which looks up ONE instrument by symbol on demand. A provider might implement one, the other, both, or neither. */
export interface ReferenceDataProvider {
  fetchExchanges(): Promise<NormalizedExchangeInfo[]>;
  fetchInstrumentUniverse(exchangeCode?: string): Promise<NormalizedInstrumentReference[]>;
}
