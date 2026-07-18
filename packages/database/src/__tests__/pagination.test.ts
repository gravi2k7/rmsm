import { describe, expect, it } from "vitest";
import { buildPaginatedResult, paginate, toSkipTake, type CountableFindManyDelegate } from "../pagination/pagination";

describe("toSkipTake", () => {
  it("defaults to page 1, pageSize 50 when absent", () => {
    expect(toSkipTake({})).toEqual({ take: 50, skip: 0, page: 1, pageSize: 50 });
  });

  it("computes skip correctly for page 3", () => {
    expect(toSkipTake({ page: 3, pageSize: 20 })).toEqual({ take: 20, skip: 40, page: 3, pageSize: 20 });
  });

  it("clamps page below 1 up to 1", () => {
    expect(toSkipTake({ page: -5 }).page).toBe(1);
  });

  it("clamps pageSize above the max down to the max", () => {
    expect(toSkipTake({ pageSize: 10000 }).pageSize).toBe(500);
  });

  it("clamps pageSize below 1 up to 1", () => {
    expect(toSkipTake({ pageSize: 0 }).pageSize).toBe(1);
  });
});

describe("buildPaginatedResult", () => {
  it("computes totalPages via ceiling division", () => {
    const result = buildPaginatedResult(["a", "b"], 21, 1, 10);
    expect(result.pagination.totalPages).toBe(3);
  });

  it("hasNextPage is true when not on the last page", () => {
    const result = buildPaginatedResult([], 100, 1, 10);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.hasPreviousPage).toBe(false);
  });

  it("hasNextPage is false on the last page", () => {
    const result = buildPaginatedResult([], 100, 10, 10);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPreviousPage).toBe(true);
  });

  it("totalPages is never less than 1, even with zero results", () => {
    const result = buildPaginatedResult([], 0, 1, 10);
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe("paginate", () => {
  it("calls findMany and count with the derived skip/take and where clause", async () => {
    const calls: unknown[] = [];
    const delegate: CountableFindManyDelegate<{ status: string }, { id: string }> = {
      findMany: async (args) => {
        calls.push(["findMany", args]);
        return [{ id: "1" }, { id: "2" }];
      },
      count: async (args) => {
        calls.push(["count", args]);
        return 42;
      },
    };

    const result = await paginate(delegate, { status: "ACTIVE" }, { page: 2, pageSize: 2 });

    expect(calls).toEqual([
      ["findMany", { where: { status: "ACTIVE" }, skip: 2, take: 2 }],
      ["count", { where: { status: "ACTIVE" } }],
    ]);
    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({ page: 2, pageSize: 2, totalCount: 42, totalPages: 21, hasNextPage: true, hasPreviousPage: true });
  });
});
