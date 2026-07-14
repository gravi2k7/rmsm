import type {
  MarketDataProviderConfig,
  Exchange,
  TradingSession,
  SupportedTimeframe,
  Instrument,
  InstrumentAlias,
} from "@rmsm/database";
import type {
  MarketDataProviderConfigModel,
  ExchangeModel,
  TradingSessionModel,
  SupportedTimeframeModel,
  InstrumentModel,
  InstrumentAliasModel,
} from "../../interfaces/models/reference-data.models";

/**
 * Prisma row → domain model, one pure function per entity. Every
 * repository method funnels its Prisma result through the matching
 * function here before returning — the single place `Prisma.Decimal`
 * (or any other Prisma-runtime value) gets converted to a plain type,
 * so no repository method has to remember to do it inline and risk
 * missing one.
 */

export function toMarketDataProviderConfigModel(row: MarketDataProviderConfig): MarketDataProviderConfigModel {
  return { ...row };
}

export function toExchangeModel(row: Exchange): ExchangeModel {
  return { ...row };
}

export function toTradingSessionModel(row: TradingSession): TradingSessionModel {
  return { ...row };
}

export function toSupportedTimeframeModel(row: SupportedTimeframe): SupportedTimeframeModel {
  return { ...row };
}

export function toInstrumentModel(row: Instrument): InstrumentModel {
  return {
    ...row,
    tickSize: row.tickSize !== null ? row.tickSize.toString() : null,
    lotSize: row.lotSize !== null ? row.lotSize.toString() : null,
  };
}

export function toInstrumentAliasModel(row: InstrumentAlias): InstrumentAliasModel {
  return { ...row };
}
