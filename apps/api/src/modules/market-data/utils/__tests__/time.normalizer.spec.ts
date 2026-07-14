import { normalizeTimestamp, convertToUtc } from "../normalizers/time.normalizer";
import { InvalidTimestampError, InvalidTimezoneError } from "../../validation/errors/market-data-validation.error";

describe("normalizeTimestamp", () => {
  it("parses an ISO string", () => {
    const result = normalizeTimestamp("2026-01-01T00:00:00Z");
    expect(result.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("treats a 10-digit number as epoch seconds", () => {
    const result = normalizeTimestamp(1735689600); // 2025-01-01T00:00:00Z in seconds
    expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("treats a 13-digit number as epoch milliseconds", () => {
    const result = normalizeTimestamp(1735689600000);
    expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("rejects an unparseable string", () => {
    expect(() => normalizeTimestamp("not-a-date")).toThrow(InvalidTimestampError);
  });

  it("rejects a timestamp more than 60s in the future by default", () => {
    const future = Date.now() + 10 * 60 * 1000;
    expect(() => normalizeTimestamp(future)).toThrow(InvalidTimestampError);
  });

  it("allows a future timestamp when allowFuture is true", () => {
    const future = Date.now() + 10 * 60 * 1000;
    expect(() => normalizeTimestamp(future, true)).not.toThrow();
  });

  it("tolerates small clock skew (under 60s) without rejecting", () => {
    const slightlyFuture = Date.now() + 5000;
    expect(() => normalizeTimestamp(slightlyFuture)).not.toThrow();
  });

  it("rejects a negative timestamp", () => {
    expect(() => normalizeTimestamp(new Date(-1000).toISOString())).toThrow(InvalidTimestampError);
  });
});

describe("convertToUtc", () => {
  it("converts 09:30 America/New_York (EST, UTC-5, winter) to 14:30 UTC", () => {
    const wallClock = new Date(Date.UTC(2026, 0, 15, 9, 30, 0)); // Jan 15 = winter, EST
    const result = convertToUtc(wallClock, "America/New_York");
    expect(result.toISOString()).toBe("2026-01-15T14:30:00.000Z");
  });

  it("converts 09:30 America/New_York (EDT, UTC-4, summer) to 13:30 UTC", () => {
    const wallClock = new Date(Date.UTC(2026, 6, 15, 9, 30, 0)); // Jul 15 = summer, EDT
    const result = convertToUtc(wallClock, "America/New_York");
    expect(result.toISOString()).toBe("2026-07-15T13:30:00.000Z");
  });

  it("is a no-op (modulo formatting) for the UTC zone itself", () => {
    const wallClock = new Date(Date.UTC(2026, 0, 15, 9, 30, 0));
    const result = convertToUtc(wallClock, "UTC");
    expect(result.toISOString()).toBe("2026-01-15T09:30:00.000Z");
  });

  it("rejects an invalid IANA timezone identifier", () => {
    const wallClock = new Date(Date.UTC(2026, 0, 15, 9, 30, 0));
    expect(() => convertToUtc(wallClock, "Not/A_Real_Zone")).toThrow(InvalidTimezoneError);
  });
});
