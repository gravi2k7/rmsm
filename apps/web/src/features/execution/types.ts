export const ORDER_SIDES = ["BUY", "SELL"] as const;
export const ORDER_TYPES = ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] as const;

export interface Order {
  id: string;
  decisionId: string;
  symbolCode: string;
  side: (typeof ORDER_SIDES)[number];
  type: (typeof ORDER_TYPES)[number];
  status: "PENDING" | "SUBMITTED" | "ACCEPTED" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED";
  quantityUnits: number;
  filledQuantityUnits: number;
  averageFillPrice?: number;
  limitPrice?: number;
  stopPrice?: number;
  createdAt: string;
}

export interface Execution {
  id: string;
  orderId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  retryCount: number;
  maxRetries: number;
  startedAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
