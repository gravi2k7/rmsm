export interface Mt5SessionResponse {
  sessionId: string;
  accountNumber: string;
  server: string;
  connectedAt: string;
  expiresAt?: string;
}

export interface Mt5PingResponse {
  connected: boolean;
  latencyMs: number;
  terminalAvailable: boolean;
}

export interface Mt5AccountResponse {
  login: string;
  name: string;
  balance: number;
  equity: number;
  margin: number;
  marginFree: number;
  marginLevel: number;
  currency: string;
  leverage: number;
}

export interface Mt5SymbolResponse {
  name: string;
  description?: string;
  digits: number;
  contractSize: number;
  tickSize: number;
  tradeSessionName?: string;
}

export interface Mt5OrderRequestPayload {
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
  deviation?: number;
  magic?: number;
  stopLimit?: number;
}

export interface Mt5OrderResponse {
  accepted: boolean;
  orderId: string | null;
  dealId: string | null;
  positionId: string | null;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  price?: number;
  status: string;
  message?: string;
  retcode?: number;
  check?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}

export interface Mt5PositionResponse {
  ticket: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  swap?: number;
  commission?: number;
  timeOpen?: string;
}

export interface Mt5OrderHistoryResponse {
  orderId: string;
  symbol: string;
  type: string;
  volume: number;
  price: number;
  status: string;
  timeSetup: string;
  comment?: string;
}

export interface Mt5DealHistoryResponse {
  dealId: string;
  orderId?: string;
  symbol: string;
  volume: number;
  price: number;
  profit: number;
  commission: number;
  swap: number;
  time: string;
}

export interface Mt5GatewayError {
  code?: string;
  message?: string;
}
