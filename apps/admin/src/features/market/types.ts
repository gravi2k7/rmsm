export interface Exchange {
  id: string;
  name: string;
  country: string;
  timezone: string;
  type: string;
  isOpen: boolean;
}

export interface MarketSymbol {
  code: string;
  description: string;
  baseCurrency: string;
  quoteCurrency: string;
  precision: number;
  exchangeId: string;
  assetClass: string;
  instrumentType: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
