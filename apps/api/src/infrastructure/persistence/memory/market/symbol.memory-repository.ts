import { Injectable } from "@nestjs/common";
import type { SymbolRepository, SymbolCode, MarketSymbol, Instrument, AssetClass } from "@rmsm/market";

/** In-memory `SymbolRepository` — see `exchange.memory-repository.ts`'s
 * own doc comment for the shared rationale (Phase 4A persistence
 * strategy). Keyed by the symbol code's own string value, since
 * `SymbolCode` is a value object without a natural `Map` key otherwise. */
@Injectable()
export class InMemorySymbolRepository implements SymbolRepository {
  private readonly symbols = new Map<string, MarketSymbol>();
  private readonly instrumentsBySymbol = new Map<string, Instrument[]>();

  async findByCode(code: SymbolCode): Promise<MarketSymbol | null> {
    return this.symbols.get(code.value) ?? null;
  }

  async findByAssetClass(assetClass: AssetClass): Promise<MarketSymbol[]> {
    return Array.from(this.symbols.values()).filter((s) => s.assetClass === assetClass);
  }

  async findByExchange(exchangeId: string): Promise<MarketSymbol[]> {
    return Array.from(this.symbols.values()).filter((s) => s.exchangeId === exchangeId);
  }

  async save(symbol: MarketSymbol): Promise<void> {
    this.symbols.set(symbol.code.value, symbol);
  }

  async findInstrumentsBySymbol(code: SymbolCode): Promise<Instrument[]> {
    return this.instrumentsBySymbol.get(code.value) ?? [];
  }

  async saveInstrument(instrument: Instrument): Promise<void> {
    const key = instrument.symbolCode.value;
    const existing = this.instrumentsBySymbol.get(key) ?? [];
    this.instrumentsBySymbol.set(key, [...existing.filter((i) => i.id !== instrument.id), instrument]);
  }
}
