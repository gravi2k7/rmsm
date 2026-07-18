import { describe, expect, it } from "vitest";
import { z } from "zod";
import { booleanFromString, commaSeparatedList, durationMs, port } from "../env/env.parser";

describe("booleanFromString", () => {
  const schema = z.object({ FLAG: booleanFromString(false) });

  it("parses 'true' as true", () => {
    expect(schema.parse({ FLAG: "true" }).FLAG).toBe(true);
  });
  it("parses 'TRUE' case-insensitively", () => {
    expect(schema.parse({ FLAG: "TRUE" }).FLAG).toBe(true);
  });
  it("parses 'false' as false", () => {
    expect(schema.parse({ FLAG: "false" }).FLAG).toBe(false);
  });
  it("parses an arbitrary non-'true' string as false", () => {
    expect(schema.parse({ FLAG: "yes" }).FLAG).toBe(false);
  });
  it("uses the default when absent", () => {
    expect(schema.parse({}).FLAG).toBe(false);
    const trueDefaultSchema = z.object({ FLAG: booleanFromString(true) });
    expect(trueDefaultSchema.parse({}).FLAG).toBe(true);
  });
});

describe("commaSeparatedList", () => {
  const schema = z.object({ LIST: commaSeparatedList() });

  it("splits a comma-separated string", () => {
    expect(schema.parse({ LIST: "a,b,c" }).LIST).toEqual(["a", "b", "c"]);
  });
  it("trims whitespace around entries", () => {
    expect(schema.parse({ LIST: " a , b ,c " }).LIST).toEqual(["a", "b", "c"]);
  });
  it("drops empty segments from trailing/double commas", () => {
    expect(schema.parse({ LIST: "a,,b," }).LIST).toEqual(["a", "b"]);
  });
  it("defaults to an empty array when absent", () => {
    expect(schema.parse({}).LIST).toEqual([]);
  });
});

describe("durationMs", () => {
  const schema = z.object({ TTL: durationMs(1000) });

  it("coerces a numeric string", () => {
    expect(schema.parse({ TTL: "5000" }).TTL).toBe(5000);
  });
  it("uses the default when absent", () => {
    expect(schema.parse({}).TTL).toBe(1000);
  });
  it("rejects zero", () => {
    expect(schema.safeParse({ TTL: "0" }).success).toBe(false);
  });
  it("rejects a negative value", () => {
    expect(schema.safeParse({ TTL: "-100" }).success).toBe(false);
  });
  it("rejects a fractional value", () => {
    expect(schema.safeParse({ TTL: "100.5" }).success).toBe(false);
  });
});

describe("port", () => {
  const schema = z.object({ PORT: port(3000) });

  it("coerces a numeric string", () => {
    expect(schema.parse({ PORT: "8080" }).PORT).toBe(8080);
  });
  it("uses the default when absent", () => {
    expect(schema.parse({}).PORT).toBe(3000);
  });
  it("rejects 0", () => {
    expect(schema.safeParse({ PORT: "0" }).success).toBe(false);
  });
  it("rejects a value above 65535", () => {
    expect(schema.safeParse({ PORT: "70000" }).success).toBe(false);
  });
});
