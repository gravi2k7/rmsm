import type {
  BrokerType,
  BrokerHealthStatus,
  BrokerTimeframe,
  BrokerOrderType,
  BrokerOrderStatus,
  BrokerPositionSide,
  BrokerConnectionStatus,
} from "../contracts/broker.contracts";

/**
 * The shared, broker-agnostic contract shapes every `BrokerProvider`
 * maps into and out of — this module's equivalent of market-data's
 * `Normalized*` interfaces. MetaTrader 5 (and every future broker on
 * BR-001's roadmap) reads/writes these; nothing outside a broker's own
 * `providers/<broker>/` folder ever sees that broker's raw
 * gateway/API shapes, matching MD-004's "do not expose raw provider
 * models outside the provider" discipline applied here to the whole
 * Broker Integration domain.
 */

/** Never logged in full — see every `*ErrorMapper`/`*Client` in this domain's own discipline around `password`. */
export interface BrokerCredentials {
  login: string;
  password: string;
  server: string;
  /** MT5-specific ("the path to a local terminal installation"), but kept on the shared shape rather than a MetaTrader5-only type — a future desktop-terminal-based broker (a re-added FIX/desktop bridge, for instance) could need the same field, and an unused optional field costs nothing on brokers that ignore it. */
  terminalPath?: string;
}

export interface BrokerSession {
  sessionId: string;
  accountNumber: string;
  server: string;
  connectedAt: Date;
  expiresAt?: Date;
}

export interface BrokerAccountInfo {
  accountNumber: string;
  accountName: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  leverage: number;
}

export interface BrokerSymbolInfo {
  symbol: string;
  description?: string;
  digits: number;
  contractSize: number;
  tickSize: number;
  tradingSession?: string;
}

export interface BrokerQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  eventTime: Date;
}

export interface BrokerTick {
  symbol: string;
  bid: number;
  ask: number;
  last?: number;
  volume?: number;
  eventTime: Date;
}

export interface BrokerCandle {
  symbol: string;
  timeframe: BrokerTimeframe;
  eventTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BrokerHistoricalCandlesRequest {
  symbol: string;
  timeframe: BrokerTimeframe;
  from: Date;
  to: Date;
}

export interface BrokerOrderRequest {
  symbol: string;
  type: BrokerOrderType;
  volume: number;
  /** Required for the four pending order types (Buy/Sell Limit/Stop); ignored for Market Buy/Sell. */
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
}

export interface BrokerOrderModification {
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface BrokerOrderResult {
  orderId: string;
  status: BrokerOrderStatus;
  symbol: string;
  type: BrokerOrderType;
  volume: number;
  price?: number;
  message?: string;
}

export interface BrokerPosition {
  positionId: string;
  symbol: string;
  side: BrokerPositionSide;
  volume: number;
  openPrice: number;
  currentPrice: number;
  floatingProfit: number;
  swap: number;
  commission: number;
  openedAt: Date;
}

export interface BrokerDateRange {
  from: Date;
  to: Date;
}

export interface BrokerOrderRecord {
  orderId: string;
  symbol: string;
  type: BrokerOrderType;
  volume: number;
  price: number;
  status: BrokerOrderStatus;
  placedAt: Date;
}

export interface BrokerDealRecord {
  dealId: string;
  orderId?: string;
  symbol: string;
  volume: number;
  price: number;
  profit: number;
  commission: number;
  swap: number;
  executedAt: Date;
}

export interface BrokerMarginCalculationRequest {
  symbol: string;
  volume: number;
  side: BrokerPositionSide;
}

export interface BrokerMarginResult {
  requiredMargin: number;
  freeMarginAfter: number;
  marginLevelAfter: number;
}

export interface BrokerPositionSizeRequest {
  symbol: string;
  riskAmount: number;
  stopLossDistance: number;
}

export interface BrokerRiskValidation {
  allowed: boolean;
  reason?: string;
}

/** Returned by every `subscribe*` method on `BrokerStreamingService` — the one handle a caller needs to stop receiving events, regardless of what broker-specific transport (WebSocket, long-poll, etc.) is underneath. */
export interface BrokerSubscription {
  unsubscribe(): void;
}

export interface BrokerConnectionHealth {
  status: BrokerConnectionStatus;
  lastConnectedAt?: Date;
  latencyMs?: number;
}

export interface BrokerHealthSnapshot {
  status: BrokerHealthStatus;
  connected: boolean;
  sessionValid: boolean;
  latencyMs?: number;
  lastCheckedAt: Date;
  message?: string;
}

export interface BrokerMetadata {
  name: string;
  version: string;
  brokerType: BrokerType;
  supportsStreaming: boolean;
  supportsOrderExecution: boolean;
  supportsPositions: boolean;
  supportsHistory: boolean;
  supportsRiskManagement: boolean;
  healthStatus: BrokerHealthStatus;
}
