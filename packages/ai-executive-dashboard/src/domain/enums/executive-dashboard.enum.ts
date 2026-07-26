export const WidgetType = {
  MARKET: "MARKET",
  STRATEGY: "STRATEGY",
  SIGNAL: "SIGNAL",
  PORTFOLIO: "PORTFOLIO",
  RISK: "RISK",
} as const;
export type WidgetType = (typeof WidgetType)[keyof typeof WidgetType];
export const WIDGET_TYPES = Object.values(WidgetType);
