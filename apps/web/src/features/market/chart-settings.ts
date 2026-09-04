import type { CrosshairMode } from "lightweight-charts";

export interface MarketChartSettings {
  appearance: {
    backgroundColor: string;
    textColor: string;
    gridVisible: boolean;
    gridOpacity: number;
  };

  candles: {
    upColor: string;
    downColor: string;
    wickUpColor: string;
    wickDownColor: string;
    borderVisible: boolean;
    wickVisible: boolean;
  };

  crosshair: {
    mode: CrosshairMode;
    lineOpacity: number;
    showTimeLabel: boolean;
    showPriceLabel: boolean;
    showOHLC: boolean;
  };

  priceScale: {
    autoScale: boolean;
    borderVisible: boolean;
    lastValueVisible: boolean;
    priceLineVisible: boolean;
  };

  timeScale: {
    timeVisible: boolean;
    secondsVisible: boolean;
    borderVisible: boolean;
  };

  trading: {
    showPositions: boolean;
    showPositionLabels: boolean;
    positionAlignment: "left" | "middle" | "right";
    showRiskLines: boolean;
  };
}

export const DEFAULT_MARKET_CHART_SETTINGS: MarketChartSettings = {
  appearance: {
    backgroundColor: "transparent",
    textColor: "#94a3b8",
    gridVisible: true,
    gridOpacity: 0.06,
  },

  candles: {
    upColor: "#22c55e",
    downColor: "#ef4444",
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
    borderVisible: false,
    wickVisible: true,
  },

  crosshair: {
    mode: 0,
    lineOpacity: 0.6,
    showTimeLabel: true,
    showPriceLabel: true,
    showOHLC: true,
  },

  priceScale: {
    autoScale: true,
    borderVisible: true,
    lastValueVisible: true,
    priceLineVisible: true,
  },

  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderVisible: true,
  },

  trading: {
    showPositions: true,
    showPositionLabels: true,
    positionAlignment: "right",
    showRiskLines: true,
  },
};

export function cloneMarketChartSettings(
  settings: MarketChartSettings,
): MarketChartSettings {
  return {
    appearance: {
      ...settings.appearance,
    },
    candles: {
      ...settings.candles,
    },
    crosshair: {
      ...settings.crosshair,
    },
    priceScale: {
      ...settings.priceScale,
    },
    timeScale: {
      ...settings.timeScale,
    },
    trading: {
      ...settings.trading,
    },
  };
}
