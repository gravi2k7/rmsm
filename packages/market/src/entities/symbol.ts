import { Entity, Guard } from "@rmsm/core";
import { SymbolCode } from "../value-objects/symbol-code";
import { CurrencyCode } from "../value-objects/currency";
import { TickSize } from "../value-objects/tick-size";
import { LotSize } from "../value-objects/lot-size";
import { Volume } from "../value-objects/volume";
import type { AssetClass } from "../types/asset-class";
import type { InstrumentType } from "../types/instrument-type";

export interface SymbolProps {
  readonly code: SymbolCode;
  readonly description: string;
  readonly baseCurrency: CurrencyCode;
  readonly quoteCurrency: CurrencyCode;
  readonly tickSize: TickSize;
  /** Monetary value of one point of movement, in quote-currency terms —
   * e.g. for a standard-lot `EURUSD` position, one point (`0.0001`) is
   * worth $10. */
  readonly pointValue: number;
  readonly lotSize: LotSize;
  /** Units of the underlying one contract represents — for most forex/
   * CFD symbols this equals `lotSize.units`; futures/options often
   * differ (e.g. one E-mini S&P contract represents $50 x index price,
   * not a literal unit count), so it's tracked separately rather than
   * assumed equal to `lotSize`. */
  readonly contractSize: number;
  readonly minVolume: Volume;
  readonly maxVolume: Volume;
  readonly precision: number;
  readonly exchangeId: string;
  readonly assetClass: AssetClass;
  readonly instrumentType: InstrumentType;
}

/**
 * The tradable instrument definition — everything needed to correctly
 * price, size, and validate an order for this symbol, independent of any
 * specific quote/candle/tick data (those are separate entities that
 * reference a `Symbol` by its `SymbolCode`, not the other way around —
 * `Symbol` doesn't hold a live order book or price history itself).
 *
 * Named `MarketSymbol`, not `Symbol` — `Symbol` is a JavaScript built-in
 * primitive type; shadowing it package-wide would be a real footgun for
 * any consumer that also needs the real `Symbol`.
 */
export class MarketSymbol extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: SymbolProps,
  ) {
    super(id);
  }

  static create(id: string, props: SymbolProps): MarketSymbol {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.description, "description");
    Guard.againstEmptyString(props.exchangeId, "exchangeId");
    Guard.againstOutOfRange(props.precision, 0, 10, "precision");
    Guard.ensure(props.contractSize > 0, "contractSize must be positive.");
    Guard.ensure(props.pointValue > 0, "pointValue must be positive.");
    Guard.ensure(
      props.minVolume.units <= props.maxVolume.units,
      `minVolume (${props.minVolume.units}) must not exceed maxVolume (${props.maxVolume.units}).`,
    );
    return new MarketSymbol(id, props);
  }

  get code(): SymbolCode {
    return this.props.code;
  }

  get description(): string {
    return this.props.description;
  }

  get baseCurrency(): CurrencyCode {
    return this.props.baseCurrency;
  }

  get quoteCurrency(): CurrencyCode {
    return this.props.quoteCurrency;
  }

  get tickSize(): TickSize {
    return this.props.tickSize;
  }

  get pointValue(): number {
    return this.props.pointValue;
  }

  get lotSize(): LotSize {
    return this.props.lotSize;
  }

  get contractSize(): number {
    return this.props.contractSize;
  }

  get minVolume(): Volume {
    return this.props.minVolume;
  }

  get maxVolume(): Volume {
    return this.props.maxVolume;
  }

  get precision(): number {
    return this.props.precision;
  }

  get exchangeId(): string {
    return this.props.exchangeId;
  }

  get assetClass(): AssetClass {
    return this.props.assetClass;
  }

  get instrumentType(): InstrumentType {
    return this.props.instrumentType;
  }

  /** Whether `volume` falls within this symbol's own tradable bounds. */
  isVolumeAllowed(volume: Volume): boolean {
    return volume.isWithin(this.props.minVolume, this.props.maxVolume);
  }
}
