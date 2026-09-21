export type MarketIndicatorType =
  | "SMA"
  | "EMA"
  | "WMA"
  | "VWAP"
  | "BOLLINGER"
  | "RSI"
  | "MACD"
  | "STOCHASTIC"
  | "ATR"
  | "ADX"
  | "CCI"
  | "ROC"
  | "WILLIAMS_R"
  | "OBV"
  | "VOLUME"
  | "VWMA";

export interface MovingAverageIndicator {
  id: string;
  type: MarketIndicatorType;
  period: number;
  source: "close";
  visible: boolean;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}
