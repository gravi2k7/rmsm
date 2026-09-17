export type Instrument = {
  id: string;
  exchangeId: string | null;
  symbol: string;
  name: string;
  assetClass: string;
  status: string;
  currency: string;
  isin?: string | null;
  cusip?: string | null;
  tickSize?: string | null;
  lotSize?: string | null;
  listedAt?: string | null;
  delistedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Quote = {
  id: string;
  instrumentId: string;
  bidPrice?: string | null;
  askPrice?: string | null;
  lastPrice?: string | null;
  bidSize?: string | null;
  askSize?: string | null;
  eventTime: string;
  providerId: string;
  source: string;
};

export type CandleInterval =
  | "ONE_MINUTE"
  | "FIVE_MINUTES"
  | "FIFTEEN_MINUTES"
  | "THIRTY_MINUTES"
  | "ONE_HOUR"
  | "FOUR_HOURS"
  | "ONE_DAY"
  | "ONE_WEEK"
  | "ONE_MONTH";

export type Candle = {
  id: string;
  instrumentId: string;
  interval: CandleInterval;
  eventTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  providerId: string;
  source: string;
  isCorrection: boolean;
  supersedesId?: string | null;
};

export type MarketDataStreamMessage =
  | {
      type: "market-data.connected";
    }
  | {
      type: "market-data.quote";
      data: Quote;
    }
  | {
      type: "market-data.candle";
      data: Candle;
    };
