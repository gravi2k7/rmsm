import type { SymbolCode } from "../value-objects/symbol-code";
import type { MarketSymbol } from "../entities/symbol";
import type { Instrument } from "../entities/instrument";
import type { AssetClass } from "../types/asset-class";

export interface SymbolRepository {
  findByCode(code: SymbolCode): Promise<MarketSymbol | null>;
  findByAssetClass(assetClass: AssetClass): Promise<MarketSymbol[]>;
  findByExchange(exchangeId: string): Promise<MarketSymbol[]>;
  save(symbol: MarketSymbol): Promise<void>;

  findInstrumentsBySymbol(code: SymbolCode): Promise<Instrument[]>;
  saveInstrument(instrument: Instrument): Promise<void>;
}
