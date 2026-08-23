import type { NormalizedQuote } from "../../interfaces/normalized-market-data.interface";

export interface CTraderFixField {
  readonly tag: number;
  readonly value: string;
}

export type CTraderFixFields = readonly CTraderFixField[];

export interface CTraderFixClientOptions {
  readonly host: string;
  readonly port: number;
  readonly tls: boolean;
  readonly senderCompId: string;
  readonly targetCompId: string;
  readonly senderSubId: string;
  readonly targetSubId: string | undefined;
  readonly username: string;
  readonly password: string;
  readonly heartbeatIntervalMs: number;
  readonly connectTimeoutMs: number;
  readonly reconnectDelayMs: number;
  readonly maxReconnectAttempts: number;
  readonly resetSequenceOnLogon: boolean;
}

export interface CTraderFixQuote {
  readonly providerSymbol: string;
  readonly bidPrice?: string;
  readonly askPrice?: string;
  readonly bidSize?: string;
  readonly askSize?: string;
  readonly eventTime: Date;
  readonly sourceTimestamp?: Date;
}

export interface CTraderFixConnectionState {
  readonly connected: boolean;
  readonly loggedOn: boolean;
  readonly lastMessageAt: Date | null;
  readonly lastQuoteAt: Date | null;
  readonly reconnectAttempts: number;
}

export type CTraderFixQuoteListener = (
  quote: NormalizedQuote,
) => void;

export interface CTraderInstrumentCatalogEntry {
  readonly providerInstrumentId: string;
  readonly providerSymbol: string;
  readonly name: string | null;
  readonly digits: number | null;
}

export interface CTraderInstrumentCatalog {
  readonly requestId: string;
  readonly instruments: readonly CTraderInstrumentCatalogEntry[];
  readonly receivedAt: Date;
}
