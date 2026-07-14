import type { CandleInterval, MarketDataSource, CorporateActionType } from "@rmsm/database";

/** See reference-data.models.ts's header comment for the domain-model / no-Prisma-objects rule these all follow. */

export interface MarketCandleModel {
  id: string;
  instrumentId: string;
  interval: CandleInterval;
  eventTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  providerId: string;
  source: MarketDataSource;
  receivedAt: Date;
  importJobId: string | null;
  sourceTimestamp: Date | null;
  normalizationVersion: number;
  isCorrection: boolean;
  supersedesId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketQuoteModel {
  id: string;
  instrumentId: string;
  bidPrice: string | null;
  askPrice: string | null;
  lastPrice: string | null;
  bidSize: string | null;
  askSize: string | null;
  eventTime: Date;
  providerId: string;
  source: MarketDataSource;
  receivedAt: Date;
  sourceTimestamp: Date | null;
  createdAt: Date;
}

export interface MarketTickModel {
  id: string;
  instrumentId: string;
  price: string;
  size: string;
  eventTime: Date;
  providerId: string;
  source: MarketDataSource;
  receivedAt: Date;
  sourceTimestamp: Date | null;
  createdAt: Date;
}

export interface CorporateActionModel {
  id: string;
  instrumentId: string;
  type: CorporateActionType;
  effectiveDate: Date;
  value: string;
  announcedAt: Date | null;
  providerId: string;
  source: MarketDataSource;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
