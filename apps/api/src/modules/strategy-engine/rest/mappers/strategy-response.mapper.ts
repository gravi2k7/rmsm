import type { Strategy } from "../../domain/aggregates/strategy.aggregate";
import { StrategyResponseDto, PaginatedStrategyListDto } from "../dto/strategy-response.dto";
import type { StrategyListResult } from "../../domain/repositories/strategy.repository.interface";

export function toStrategyResponseDto(strategy: Strategy): StrategyResponseDto {
  const dto = new StrategyResponseDto();
  dto.id = strategy.id;
  dto.organizationId = strategy.organizationId;
  dto.name = strategy.name;
  dto.description = strategy.description;
  dto.category = strategy.category;
  dto.status = strategy.status;
  dto.tags = [...strategy.tags];
  dto.currentPublishedVersionId = strategy.currentPublishedVersionId;
  dto.createdByUserId = strategy.createdByUserId;
  dto.createdAt = strategy.createdAt;
  return dto;
}

export function toPaginatedStrategyListDto(result: StrategyListResult, page: number, pageSize: number): PaginatedStrategyListDto {
  const totalPages = Math.max(1, Math.ceil(result.totalCount / pageSize));
  return {
    data: result.strategies.map(toStrategyResponseDto),
    pagination: { page, pageSize, totalCount: result.totalCount, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
}
