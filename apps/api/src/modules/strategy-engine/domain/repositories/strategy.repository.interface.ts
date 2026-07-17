import type { Strategy } from "../aggregates/strategy.aggregate";
import type { StrategyCategory } from "../value-objects/strategy-category.value-object";
import type { StrategyStatus } from "../value-objects/strategy-status.enum";

/**
 * Domain-layer repository interface — a real gap in Milestone 1, filled
 * here rather than assumed. Repository interfaces belong in the domain
 * layer by DDD convention (they describe what persistence the domain
 * NEEDS, independent of how); Milestone 1 built the aggregates but
 * didn't yet name this contract. Filled now, before any Prisma-backed
 * implementation exists, so the implementation genuinely satisfies a
 * domain-defined contract rather than the reverse.
 */
export interface StrategyListFilter {
  organizationId: string;
  status?: StrategyStatus;
  category?: StrategyCategory;
  tag?: string;
  searchText?: string;
  page: number;
  pageSize: number;
}

export interface StrategyListResult {
  strategies: Strategy[];
  totalCount: number;
}

export interface StrategyRepository {
  findById(id: string, organizationId: string): Promise<Strategy | null>;
  findBySlug(slug: string, organizationId: string): Promise<Strategy | null>;
  save(strategy: Strategy): Promise<void>;
  list(filter: StrategyListFilter): Promise<StrategyListResult>;
}
