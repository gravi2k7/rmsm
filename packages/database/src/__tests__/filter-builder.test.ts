import { describe, expect, it } from "vitest";
import { FilterBuilder } from "../filters/filter.builder";

interface StrategyWhere extends Record<string, unknown> {
  status?: unknown;
  category?: unknown;
  name?: unknown;
  createdAt?: unknown;
  tags?: unknown;
}

describe("FilterBuilder.equals", () => {
  it("includes the field when a value is provided", () => {
    const where = new FilterBuilder<StrategyWhere>().equals("status", "ACTIVE").build();
    expect(where).toEqual({ status: "ACTIVE" });
  });

  it.each([undefined, null, ""])("omits the field when the value is %j", (value) => {
    const where = new FilterBuilder<StrategyWhere>().equals("status", value).build();
    expect(where).toEqual({});
  });

  it("includes falsy-but-meaningful values like 0 and false", () => {
    interface NumWhere extends Record<string, unknown> {
      count?: unknown;
      active?: unknown;
    }
    const where = new FilterBuilder<NumWhere>().equals("count", 0).equals("active", false).build();
    expect(where).toEqual({ count: 0, active: false });
  });
});

describe("FilterBuilder.contains", () => {
  it("builds a case-insensitive contains clause for a non-empty string", () => {
    const where = new FilterBuilder<StrategyWhere>().contains("name", "momentum").build();
    expect(where).toEqual({ name: { contains: "momentum", mode: "insensitive" } });
  });

  it("omits the field for undefined or empty string", () => {
    expect(new FilterBuilder<StrategyWhere>().contains("name", undefined).build()).toEqual({});
    expect(new FilterBuilder<StrategyWhere>().contains("name", "").build()).toEqual({});
  });
});

describe("FilterBuilder.in", () => {
  it("builds an in clause for a non-empty array", () => {
    const where = new FilterBuilder<StrategyWhere>().in("category", ["MOMENTUM", "SWING"]).build();
    expect(where).toEqual({ category: { in: ["MOMENTUM", "SWING"] } });
  });

  it("omits the field for undefined or an empty array", () => {
    expect(new FilterBuilder<StrategyWhere>().in("category", undefined).build()).toEqual({});
    expect(new FilterBuilder<StrategyWhere>().in("category", []).build()).toEqual({});
  });
});

describe("FilterBuilder.range", () => {
  it("includes only the bounds actually supplied", () => {
    const where = new FilterBuilder<StrategyWhere>().range("createdAt", { gte: new Date("2026-01-01") }).build();
    expect(where).toEqual({ createdAt: { gte: new Date("2026-01-01") } });
  });

  it("includes both bounds when both are supplied", () => {
    const gte = new Date("2026-01-01");
    const lte = new Date("2026-02-01");
    const where = new FilterBuilder<StrategyWhere>().range("createdAt", { gte, lte }).build();
    expect(where).toEqual({ createdAt: { gte, lte } });
  });

  it("omits the field entirely when neither bound is supplied", () => {
    const where = new FilterBuilder<StrategyWhere>().range("createdAt", {}).build();
    expect(where).toEqual({});
  });
});

describe("FilterBuilder.raw", () => {
  it("sets the field to the given clause verbatim", () => {
    const where = new FilterBuilder<StrategyWhere>().raw("tags", { hasSome: ["beta"] }).build();
    expect(where).toEqual({ tags: { hasSome: ["beta"] } });
  });
});

describe("FilterBuilder — chaining", () => {
  it("combines multiple conditions into one where clause", () => {
    const where = new FilterBuilder<StrategyWhere>()
      .equals("status", "ACTIVE")
      .contains("name", "trend")
      .in("category", ["MOMENTUM"])
      .build();
    expect(where).toEqual({
      status: "ACTIVE",
      name: { contains: "trend", mode: "insensitive" },
      category: { in: ["MOMENTUM"] },
    });
  });

  it("build() returns a fresh object each call, not a live reference", () => {
    const builder = new FilterBuilder<StrategyWhere>().equals("status", "ACTIVE");
    const first = builder.build();
    const second = builder.build();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});
