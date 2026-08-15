import { describe, expect, it } from "vitest";
import {
  DEFAULT_INDICATORS,
  type IndicatorConfig,
} from "../config";

describe("indicator configuration", () => {
  it("defines the complete production indicator set", () => {
    expect(DEFAULT_INDICATORS.map((indicator) => indicator.type)).toEqual([
      "SMA",
      "EMA",
      "WMA",
      "VWAP",
      "BOLLINGER",
      "RSI",
      "MACD",
      "STOCHASTIC",
      "ATR",
      "ADX",
    ]);
  });

  it("separates overlays from indicator panes", () => {
    expect(
      DEFAULT_INDICATORS
        .filter((indicator) => indicator.placement === "overlay")
        .map((indicator) => indicator.type),
    ).toEqual([
      "SMA",
      "EMA",
      "WMA",
      "VWAP",
      "BOLLINGER",
    ]);

    expect(
      DEFAULT_INDICATORS
        .filter((indicator) => indicator.placement === "pane")
        .map((indicator) => indicator.type),
    ).toEqual([
      "RSI",
      "MACD",
      "STOCHASTIC",
      "ATR",
      "ADX",
    ]);
  });

  it("starts indicators hidden without changing existing chart behavior", () => {
    expect(DEFAULT_INDICATORS.every((indicator) => !indicator.visible)).toBe(
      true,
    );
  });

  it("keeps indicator configurations structurally valid", () => {
    DEFAULT_INDICATORS.forEach((indicator: IndicatorConfig) => {
      expect(indicator.id).toBeTruthy();
      expect(indicator.type).toBeTruthy();
      expect(["overlay", "pane"]).toContain(indicator.placement);
      expect(indicator.visible).toBe(false);
    });
  });
});
