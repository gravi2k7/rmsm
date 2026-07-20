import { describe, expect, it } from "vitest";
import { paginateClientSide } from "../paginate-client-side";

describe("paginateClientSide", () => {
  const items = Array.from({ length: 45 }, (_, i) => i);

  it("returns the first page and correct meta by default", () => {
    const { pageItems, meta } = paginateClientSide(items, 1, 20);
    expect(pageItems).toEqual(items.slice(0, 20));
    expect(meta).toEqual({ page: 1, pageSize: 20, totalCount: 45, totalPages: 3, hasNextPage: true, hasPreviousPage: false });
  });

  it("returns a partial last page", () => {
    const { pageItems, meta } = paginateClientSide(items, 3, 20);
    expect(pageItems).toEqual(items.slice(40, 45));
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
  });

  it("clamps an out-of-range page down to the last valid page", () => {
    const { meta } = paginateClientSide(items, 99, 20);
    expect(meta.page).toBe(3);
  });

  it("clamps a page below 1 up to 1", () => {
    const { meta } = paginateClientSide(items, -5, 20);
    expect(meta.page).toBe(1);
  });

  it("handles an empty array without dividing by zero", () => {
    const { pageItems, meta } = paginateClientSide([], 1, 20);
    expect(pageItems).toEqual([]);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });
});
