import { candleIntervalToMs, CANDLE_INTERVAL_MS, CANDLE_INTERVALS_ASCENDING } from "../constants/candle-interval.constants";

describe("candleIntervalToMs", () => {
  it("returns the correct millisecond value for each interval", () => {
    expect(candleIntervalToMs("ONE_MINUTE")).toBe(60_000);
    expect(candleIntervalToMs("FIVE_MINUTES")).toBe(300_000);
    expect(candleIntervalToMs("ONE_HOUR")).toBe(3_600_000);
    expect(candleIntervalToMs("ONE_DAY")).toBe(86_400_000);
  });

  it("every interval in CANDLE_INTERVALS_ASCENDING has a corresponding CANDLE_INTERVAL_MS entry", () => {
    for (const interval of CANDLE_INTERVALS_ASCENDING) {
      expect(CANDLE_INTERVAL_MS[interval]).toBeGreaterThan(0);
    }
  });

  it("CANDLE_INTERVALS_ASCENDING is genuinely ascending in duration", () => {
    for (let i = 1; i < CANDLE_INTERVALS_ASCENDING.length; i++) {
      const prevInterval = CANDLE_INTERVALS_ASCENDING[i - 1];
      const currInterval = CANDLE_INTERVALS_ASCENDING[i];
      if (!prevInterval || !currInterval) throw new Error("unexpected undefined interval in fixture array");
      const prev = CANDLE_INTERVAL_MS[prevInterval];
      const curr = CANDLE_INTERVAL_MS[currInterval];
      expect(curr).toBeGreaterThan(prev);
    }
  });
});
