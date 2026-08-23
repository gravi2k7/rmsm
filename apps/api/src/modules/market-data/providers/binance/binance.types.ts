export type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

export interface BinanceExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision?: number;
  quotePrecision?: number;
}

export interface BinanceExchangeInfoResponse {
  timezone?: string;
  serverTime?: number;
  symbols?: BinanceExchangeInfoSymbol[];
}

export interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

export interface BinanceErrorResponse {
  code?: number;
  msg?: string;
}
