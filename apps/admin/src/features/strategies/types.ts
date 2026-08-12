export const STRATEGY_CATEGORIES = [
  "TREND_FOLLOWING",
  "MEAN_REVERSION",
  "MOMENTUM",
  "BREAKOUT",
  "SCALPING",
  "SWING",
  "ARBITRAGE",
  "MARKET_MAKING",
  "CUSTOM",
] as const;

export const STRATEGY_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export type StrategyCategory = (typeof STRATEGY_CATEGORIES)[number];
export type StrategyStatus = (typeof STRATEGY_STATUSES)[number];

export interface Strategy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: StrategyCategory;
  status: StrategyStatus;
  tags: string[];
  currentPublishedVersionId: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface StrategyPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedStrategies {
  data: Strategy[];
  pagination: StrategyPagination;
}

export interface CreateStrategyInput {
  name: string;
  description: string;
  category: StrategyCategory;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  addTags?: string[];
  removeTags?: string[];
}
