import { Injectable } from "@nestjs/common";
import type { StrategyCategory } from "../../domain/value-objects/strategy-category.value-object";
import type { StrategyStatus } from "../../domain/value-objects/strategy-status.enum";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import type { StrategyListResult } from "../../domain/repositories/strategy.repository.interface";

/**
 * Covers BOTH "ListStrategies" and "SearchStrategies" (Application
 * Services list) — one query, one handler. The domain's own
 * `StrategyListFilter` (Milestone 2) already supports an optional
 * `searchText` alongside status/category/tag filters and pagination;
 * "search" isn't a structurally different operation from "list with a
 * text filter applied," so a second, near-duplicate query class would
 * only add indirection without a real behavioral difference.
 * `GET /strategies` and `GET /strategies/search` (this milestone's own
 * route list names both) both resolve to this same query at the REST
 * layer — see `strategy.controller.ts`.
 */
export class ListStrategiesQuery {
  constructor(
    public readonly organizationId: string,
    public readonly page: number,
    public readonly pageSize: number,
    public readonly status?: StrategyStatus,
    public readonly category?: StrategyCategory,
    public readonly tag?: string,
    public readonly searchText?: string,
  ) {}
}

@Injectable()
export class ListStrategiesHandler {
  constructor(private readonly strategyRepository: StrategyRepository) {}

  async execute(query: ListStrategiesQuery): Promise<StrategyListResult> {
    return this.strategyRepository.list({
      organizationId: query.organizationId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      category: query.category,
      tag: query.tag,
      searchText: query.searchText,
    });
  }
}
