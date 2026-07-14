import type { NormalizedInstrumentReference } from "./reference-data-provider.interface";

/** Looks up ONE instrument by the provider's own symbol, on demand — distinct from ReferenceDataProvider.fetchInstrumentUniverse() (a bulk catalog pull). Reuses NormalizedInstrumentReference rather than declaring a near-duplicate shape. */
export interface InstrumentProvider {
  fetchInstrument(providerSymbol: string): Promise<NormalizedInstrumentReference | null>;
}
