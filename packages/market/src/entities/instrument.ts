import { Entity, Guard } from "@rmsm/core";
import { SymbolCode } from "../value-objects/symbol-code";
import type { AssetClass } from "../types/asset-class";
import type { InstrumentType } from "../types/instrument-type";

export interface InstrumentProps {
  readonly symbolCode: SymbolCode;
  readonly exchangeId: string;
  readonly assetClass: AssetClass;
  readonly instrumentType: InstrumentType;
  readonly isTradable: boolean;
  /** Contract expiry, for instrument types that have one (`FUTURE`,
   * `OPTION`) — `undefined` for perpetual/spot instruments. A `Symbol`
   * (see `entities/symbol.ts`) is the shared pricing/sizing *definition*
   * (e.g. "E-mini S&P 500 futures" as a family); `Instrument` is one
   * specific, individually-expiring listing of it (e.g. the March 2026
   * contract) — the reason these are two separate entities rather than
   * one, and why a `Symbol` can have many `Instrument`s referencing it
   * by `symbolCode` over time. */
  readonly expiresAt?: Date;
}

export class Instrument extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: InstrumentProps,
  ) {
    super(id);
  }

  static create(id: string, props: InstrumentProps): Instrument {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.exchangeId, "exchangeId");
    return new Instrument(id, props);
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
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

  get isTradable(): boolean {
    return this.props.isTradable;
  }

  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }

  /** Whether this instrument has passed its own expiry, as of `asOf`
   * (defaults to now) — always `false` for instruments with no expiry. */
  isExpired(asOf: Date = new Date()): boolean {
    return this.props.expiresAt !== undefined && this.props.expiresAt.getTime() <= asOf.getTime();
  }
}
