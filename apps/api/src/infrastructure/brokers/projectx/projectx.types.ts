export interface ProjectXCredentials {
  username: string;
  apiKey: string;
  baseUrl?: string;
}

export interface ProjectXApiResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface ProjectXLoginResponse extends ProjectXApiResponse {
  token: string | null;
}

export interface ProjectXValidateResponse extends ProjectXApiResponse {
  newToken: string | null;
}

export interface ProjectXAccount {
  id: number;
  name: string;
  balance: number;
  canTrade: boolean;
  isVisible: boolean;
}

export interface ProjectXAccountSearchResponse extends ProjectXApiResponse {
  accounts: ProjectXAccount[];
}

export interface ProjectXContract {
  id: string;
  name: string;
  description: string;
  tickSize: number;
  tickValue: number;
  activeContract: boolean;
  symbolId: string;
}

export interface ProjectXContractResponse extends ProjectXApiResponse {
  contracts: ProjectXContract[];
}

export interface ProjectXOrder {
  id: number;
  accountId: number;
  contractId: string;
  symbolId?: string;
  creationTimestamp: string;
  updateTimestamp: string;
  status: number;
  type: number;
  side: number;
  size: number;
  limitPrice: number | null;
  stopPrice: number | null;
  fillVolume?: number;
  filledPrice?: number | null;
  customTag?: string | null;
}

export interface ProjectXOrderSearchResponse extends ProjectXApiResponse {
  orders: ProjectXOrder[];
}

export interface ProjectXPosition {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  type: number;
  size: number;
  averagePrice: number;
}

export interface ProjectXPositionSearchResponse extends ProjectXApiResponse {
  positions: ProjectXPosition[];
}

export interface ProjectXTrade {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  price: number;
  profitAndLoss: number | null;
  fees: number;
  side: number;
  size: number;
  voided: boolean;
  orderId: number;
}

export interface ProjectXTradeSearchResponse extends ProjectXApiResponse {
  trades: ProjectXTrade[];
}

export interface ProjectXPlaceOrderRequest {
  accountId: number;
  contractId: string;
  type: number;
  side: number;
  size: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
  customTag?: string | null;
  stopLossBracket?: {
    ticks: number;
    type: number;
  } | null;
  takeProfitBracket?: {
    ticks: number;
    type: number;
  } | null;
}

export interface ProjectXPlaceOrderResponse extends ProjectXApiResponse {
  orderId: number;
}

export interface ProjectXCancelOrderResponse extends ProjectXApiResponse {}

export interface ProjectXModifyOrderRequest {
  accountId: number;
  orderId: number;
  size?: number | null;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
}
