export interface Opportunity {
  id: string;
  symbolCode: string;
  strategyId: string;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "REJECTED";
  signalDirection: "BUY" | "SELL";
  signalStrength: "WEAK" | "MODERATE" | "STRONG";
  confidenceScore: number;
  trend: string;
  volatility: string;
  liquidity: string;
  createdAt: string;
  expiresAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
