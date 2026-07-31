/**
 * Raw shapes exchanged with the MT5 gateway — see `metatrader5.client.ts`'s
 * own doc comment for why this domain talks to a gateway rather than a
 * native MetaTrader 5 API. Deliberately narrow (only fields this
 * provider's mapper actually reads); nothing here is imported outside
 * `providers/metatrader5/` — `MetaTrader5Mapper`-equivalent mapping
 * happens inline in each service (this broker's payloads are close
 * enough to their `Broker*` DTO shape that a dedicated mapper class
 * would just be a thin pass-through per service; each service does its
 * own field-by-field mapping instead of adding an extra file with
 * nothing non-trivial in it, consistent with BR-001's "No Duplicate
 * Code"/"no unnecessary abstractions" standards).
 */

export interface Mt5ConnectRequest {
  login: string;
  password: string;
  server: string;
  terminalPath?: string;
}

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

export interface Mt5QuoteResponse {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
}

export interface Mt5TickResponse {
  symbol: string;
  bid: number;
  ask: number;
  last?: number;
  volume?: number;
  time: string;
}

export interface Mt5CandleResponse {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Mt5OrderRequestPayload {
  symbol: string;
  type: string;
  volume: number;
  price?: number;
  sl?: number;
  tp?: number;
  comment?: string;
}

export interface Mt5OrderResponse {
  orderId: string;
  status: string;
  symbol: string;
  type: string;
  volume: number;
  price?: number;
  message?: string;
}

export interface Mt5PositionResponse {
  ticket: string;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  profit: number;
  swap: number;
  commission: number;
  timeOpen: string;
}

export interface Mt5OrderHistoryResponse {
  orderId: string;
  symbol: string;
  type: string;
  volume: number;
  price: number;
  status: string;
  timeSetup: string;
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
  code: string;
  message: string;
}

export type Mt5StreamEventType = "tick" | "order" | "position" | "account";

export interface Mt5StreamEvent {
  type: Mt5StreamEventType;
  payload: unknown;
}
