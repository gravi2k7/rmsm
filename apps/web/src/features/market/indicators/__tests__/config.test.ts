import { describe, expect, it } from "vitest";
import {
  DEFAULT_INDICATORS,
  mergeIndicatorConfigs,
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
      "VWMA",
      "CCI",
      "ROC",
      "WILLIAMS_R",
      "OBV",
      "VOLUME",
    ]);
  });

  it("merges newly added indicators into legacy persisted configurations", () => {
    const legacyIndicators = DEFAULT_INDICATORS
      .slice(0, 10)
      .map((indicator) => ({
        ...indicator,
      }));

    const macd = legacyIndicators.find(
      (indicator) => indicator.id === "macd-12-26-9",
    );

    expect(macd).toBeDefined();

    if (macd) {
      macd.visible = true;
      macd.fastPeriod = 8;
    }

    const merged = mergeIndicatorConfigs(legacyIndicators);

    expect(merged).toHaveLength(DEFAULT_INDICATORS.length);
    expect(merged.map((indicator) => indicator.id)).toEqual(
      DEFAULT_INDICATORS.map((indicator) => indicator.id),
    );

    expect(
      merged.find(
        (indicator) => indicator.id === "macd-12-26-9",
      ),
    ).toMatchObject({
      visible: true,
      fastPeriod: 8,
    });

    expect(
      merged.find(
        (indicator) => indicator.id === "vwma-20",
      ),
    ).toMatchObject({
      type: "VWMA",
      placement: "overlay",
      period: 20,
      visible: false,
    });

    expect(
      merged.find(
        (indicator) => indicator.id === "volume",
      ),
    ).toMatchObject({
      type: "VOLUME",
      placement: "pane",
      visible: false,
    });
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
      "VWMA",
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
      "CCI",
      "ROC",
      "WILLIAMS_R",
      "OBV",
      "VOLUME",
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
