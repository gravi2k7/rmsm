import { normalizeCandle } from "../normalizers/candle.normalizer";
import { InvalidProviderPayloadError } from "../../validation/errors/market-data-validation.error";

describe("normalizeCandle", () => {
  it("normalizes a raw payload with number-typed prices and an epoch-seconds timestamp", () => {
    const result = normalizeCandle({
      symbol: "nasdaq:aapl",
      interval: "ONE_DAY",
      time: 1735689600, // 2025-01-01T00:00:00Z in seconds
      open: 100.5,
      high: 105,
      low: 99.25,
      close: 102,
      volume: 1000000,
    });

    expect(result.providerSymbol).toBe("AAPL");
    expect(result.eventTime.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(result.open).toBe("100.5");
    expect(result.volume).toBe("1000000");
  });

  it("normalizes a raw payload with string-typed prices and an ISO timestamp", () => {
    const result = normalizeCandle({
      symbol: "AAPL",
      interval: "ONE_HOUR",
      time: "2026-01-01T09:00:00Z",
      open: "100.00",
      high: "101.00",
      low: "99.00",
      close: "100.50",
      volume: "5000",
    });

    expect(result.open).toBe("100");
    expect(result.close).toBe("100.5");
  });

  it("rejects a payload missing a required field", () => {
    expect(() =>
      normalizeCandle({
        symbol: "AAPL",
        interval: "ONE_DAY",
        time: "2026-01-01T00:00:00Z",
        open: "100",
        high: "105",
        low: "99",
        close: "102",
        volume: undefined as unknown as string,
      }),
    ).toThrow(InvalidProviderPayloadError);
  });

  it("is deterministic — the same input always produces the identical output", () => {
    const input = {
      symbol: "AAPL",
      interval: "ONE_DAY" as const,
      time: "2026-01-01T00:00:00Z",
      open: "100",
      high: "105",
      low: "99",
      close: "102",
      volume: "1000",
    };
    const first = normalizeCandle(input);
    const second = normalizeCandle(input);
    expect(first).toEqual(second);
  });
});
