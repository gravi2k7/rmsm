import { ok, type Result } from "@rmsm/core";
import { MarketSymbol } from "../entities/symbol";
import { SymbolCode } from "../value-objects/symbol-code";
import { CurrencyCode } from "../value-objects/currency";
import { TickSize } from "../value-objects/tick-size";
import { LotSize } from "../value-objects/lot-size";
import { Volume } from "../value-objects/volume";
import { validateDistinctCurrencies, validateVolumeRange } from "../validators/symbol.validator";
import type { AssetClass } from "../types/asset-class";
import type { InstrumentType } from "../types/instrument-type";
import type { MarketDomainError } from "../errors/market.errors";

/** Raw, primitive input for building a `MarketSymbol` — the shape an
 * external source (an import file, an admin API payload) would actually
 * hand this domain, before any of it has been turned into value objects. */
export interface RawSymbolInput {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly baseCurrency: string;
  readonly quoteCurrency: string;
  readonly tickSize: number;
  readonly pointValue: number;
  readonly lotSizeUnits: number;
  readonly contractSize: number;
  readonly minVolume: number;
  readonly maxVolume: number;
  readonly precision: number;
  readonly exchangeId: string;
  readonly assetClass: AssetClass;
  readonly instrumentType: InstrumentType;
}

/**
 * Builds a `MarketSymbol` from raw primitive input — the one place that
 * composes every relevant value object's own `create()` call plus the
 * cross-field validators, so a caller gets one aggregated `Result`
 * instead of manually sequencing five separate value-object
 * constructions and two validator calls itself. Stops at the first
 * failure (fail-fast), matching every value object's own `Result`-based
 * construction pattern.
 */
export class SymbolFactory {
  static create(input: RawSymbolInput): Result<MarketSymbol, MarketDomainError> {
    const code = SymbolCode.create(input.code);
    if (!code.ok) return code;

    const baseCurrency = CurrencyCode.create(input.baseCurrency);
    if (!baseCurrency.ok) return baseCurrency;

    const quoteCurrency = CurrencyCode.create(input.quoteCurrency);
    if (!quoteCurrency.ok) return quoteCurrency;

    const currenciesDistinct = validateDistinctCurrencies(baseCurrency.value, quoteCurrency.value);
    if (!currenciesDistinct.ok) return currenciesDistinct;

    const tickSize = TickSize.create(input.tickSize);
    if (!tickSize.ok) return tickSize;

    const lotSize = LotSize.create(input.lotSizeUnits);
    if (!lotSize.ok) return lotSize;

    const minVolume = Volume.create(input.minVolume);
    if (!minVolume.ok) return minVolume;

    const maxVolume = Volume.create(input.maxVolume);
    if (!maxVolume.ok) return maxVolume;

    const volumeRangeValid = validateVolumeRange(minVolume.value, maxVolume.value);
    if (!volumeRangeValid.ok) return volumeRangeValid;

    const symbol = MarketSymbol.create(input.id, {
      code: code.value,
      description: input.description,
      baseCurrency: baseCurrency.value,
      quoteCurrency: quoteCurrency.value,
      tickSize: tickSize.value,
      pointValue: input.pointValue,
      lotSize: lotSize.value,
      contractSize: input.contractSize,
      minVolume: minVolume.value,
      maxVolume: maxVolume.value,
      precision: input.precision,
      exchangeId: input.exchangeId,
      assetClass: input.assetClass,
      instrumentType: input.instrumentType,
    });

    return ok(symbol);
  }
}
