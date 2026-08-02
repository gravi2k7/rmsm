import type {
  AssetClass,
  InstrumentStatus,
  MarketDataProviderType,
  CandleInterval,
  TradingSessionType,
} from "@rmsm/database";

/**
 * Domain models — the shapes AI-101's repositories return to services,
 * and the ONLY shapes services ever see. This is a deliberate departure
 * from every EP module's repository convention (EP-002 through EP-005 all
 * return Prisma-generated types directly to their service layers) — an
 * explicit instruction for AI-101 specifically, not a silent
 * reinterpretation of prior precedent. Recorded as ADR-025.
 *
 * What "never returns Prisma-specific objects" means concretely here:
 * `Prisma.Decimal` (a `decimal.js` class with its own arithmetic methods,
 * not a plain value) never crosses the repository boundary — every
 * Decimal-typed Prisma column becomes a plain `string` in these models,
 * via each repository's own mapper (repositories/mappers/). A `string`
 * still preserves full decimal precision (the same reason `Decimal`
 * exists in the first place) without leaking a Prisma-runtime class into
 * service code that shouldn't need to know Prisma exists.
 *
 * Enum types (AssetClass, CandleInterval, etc.) ARE reused directly from
 * `@rmsm/database` — these are plain string-literal-union types with zero
 * runtime coupling to `@prisma/client` (no class, no special behavior),
 * so reusing them isn't "a Prisma-specific object" in the sense this
 * instruction is about. Re-declaring an identical string-literal union a
 * second time under a different name would be needless duplication for
 * no isolation benefit.
 */
export interface MarketDataProviderConfigModel {
  id: string;
  type: MarketDataProviderType;
  name: string;
  baseUrl: string | null;
  credentialReference: string | null;

  priority: number;

  rateLimitPerMinute: number | null;

  lastConnectionTestAt: Date | null;
  lastConnectionTestStatus: string | null;

  supportedAssetClasses: AssetClass[];

  isActive: boolean;

  createdById: string | null;
  updatedById: string | null;

  createdAt: Date;
  updatedAt: Date;
}
export interface ExchangeModel {
  id: string;
  code: string;
  name: string;
  timezone: string;
  country: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradingSessionModel {
  id: string;
  exchangeId: string;
  type: TradingSessionType;
  openTime: string;
  closeTime: string;
  dayOfWeek: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportedTimeframeModel {
  id: string;
  providerId: string;
  interval: CandleInterval;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstrumentModel {
  id: string;
  exchangeId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  status: InstrumentStatus;
  currency: string;
  isin: string | null;
  cusip: string | null;
  /** Was Prisma.Decimal — see this file's header comment. */
  tickSize: string | null;
  /** Was Prisma.Decimal — see this file's header comment. */
  lotSize: string | null;
  listedAt: Date | null;
  delistedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstrumentAliasModel {
  id: string;
  instrumentId: string;
  providerId: string;
  providerSymbol: string;
  createdAt: Date;
  updatedAt: Date;
}
