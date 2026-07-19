import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

/**
 * The one pagination query shape every list endpoint in the application
 * layer accepts — offset-based, matching `@rmsm/types`'s own `Paginated<T>`
 * response shape (`items`, `total`, `page`, `pageSize`) and the identical
 * convention already established in `modules/market-data`'s own
 * `PaginationQueryDto`. A single shared DTO here so six domain modules
 * don't each redeclare the same four fields.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 50;

  @ApiPropertyOptional({ description: "Free-text search, applied per-endpoint to whichever field(s) make sense there." })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Field to sort by — the set of valid values is endpoint-specific." })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsString()
  sortDirection?: "asc" | "desc" = "desc";
}

/** Builds the `Paginated<T>` envelope (`@rmsm/types`) from a full,
 * unpaginated array — the in-memory repository adapters this phase uses
 * return full arrays (see each domain module's own `repositories/`
 * README note), so pagination is applied at this one shared layer
 * rather than duplicated per query handler. */
export function paginateArray<T>(items: readonly T[], page: number, pageSize: number): { items: T[]; total: number; page: number; pageSize: number } {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}
