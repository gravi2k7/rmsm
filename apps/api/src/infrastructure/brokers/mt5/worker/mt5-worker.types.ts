export interface Mt5WorkerCredentials {
  login: string;
  password: string;
  server: string;
}

export interface Mt5WorkerConnectionResult {
  connected: boolean;
  login: string;
  server: string;
  company?: string;
  currency?: string;
  balance?: number;
  equity?: number;
  leverage?: number;
  terminalConnected?: boolean;
  message?: string;
}

export interface Mt5WorkerOrderRequest {
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  orderType:
    | "MARKET"
    | "LIMIT"
    | "STOP"
    | "STOP_LIMIT";
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
  clientOrderId?: string;
}

export interface Mt5WorkerOrderResult {
  accepted: boolean;
  orderId?: string;
  dealId?: string;
  positionId?: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  price?: number;
  status: string;
  message?: string;
}

export interface Mt5WorkerPosition {
  ticket: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  swap: number;
  commission: number;
}

export interface Mt5WorkerAccount {
  login: string;
  name: string;
  server: string;
  company: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  leverage: number;
}

export interface Mt5Worker {
  connect(
    credentials: Mt5WorkerCredentials,
  ): Promise<Mt5WorkerConnectionResult>;

  disconnect(): Promise<void>;

  getAccount(): Promise<Mt5WorkerAccount>;

  getPositions(): Promise<Mt5WorkerPosition[]>;

  placeOrder(
    request: Mt5WorkerOrderRequest,
  ): Promise<Mt5WorkerOrderResult>;

  closePosition(
    ticket: string,
    volume?: number,
  ): Promise<Mt5WorkerOrderResult>;

  isConnected(): Promise<boolean>;
}
