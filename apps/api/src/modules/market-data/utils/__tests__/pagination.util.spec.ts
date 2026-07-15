import { toPageParams, buildPaginatedResult, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../pagination.util";

describe("toPageParams", () => {
  it("defaults to page 1, DEFAULT_PAGE_SIZE when nothing is provided", () => {
    expect(toPageParams({})).toEqual({ take: DEFAULT_PAGE_SIZE, skip: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it("computes skip correctly for page > 1", () => {
    expect(toPageParams({ page: 3, pageSize: 20 })).toEqual({ take: 20, skip: 40, page: 3, pageSize: 20 });
  });

  it("clamps page below 1 up to 1", () => {
    expect(toPageParams({ page: -5 }).page).toBe(1);
  });

  it("clamps pageSize above MAX_PAGE_SIZE down to MAX_PAGE_SIZE", () => {
    expect(toPageParams({ pageSize: 999999 }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it("clamps pageSize below 1 up to 1", () => {
    expect(toPageParams({ pageSize: 0 }).pageSize).toBe(1);
  });
});

describe("buildPaginatedResult", () => {
  it("computes hasNextPage/hasPreviousPage correctly for a middle page", () => {
    const result = buildPaginatedResult([1, 2, 3], 100, 2, 10);
    expect(result.pagination.totalPages).toBe(10);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.hasPreviousPage).toBe(true);
  });

  it("hasNextPage is false on the last page", () => {
    const result = buildPaginatedResult([1], 21, 3, 10);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNextPage).toBe(false);
  });

  it("handles zero total count without dividing by zero into totalPages", () => {
    const result = buildPaginatedResult([], 0, 1, 10);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNextPage).toBe(false);
  });
});
