export interface Portfolio {
  id: string;
  cashBalance: number;
  equity: number;
  buyingPower: number;
  marginUsed: number;
  marginAvailable: number;
  openPositionCount: number;
  closedPositionCount: number;
  createdAt: string;
}

export interface Position {
  id: string;
  symbolCode: string;
  side: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  quantityUnits: number;
  averageEntryPrice: number;
  averageExitPrice?: number;
  realizedPnl?: number;
  openedAt: string;
  closedAt?: string;
}

export interface Trade {
  id: string;
  symbolCode: string;
  side: "LONG" | "SHORT";
  quantityUnits: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  isWin: boolean;
  openedAt: string;
  closedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
