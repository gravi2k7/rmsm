import type { DrawingType } from "./types";

export interface DrawingToolPalette {
  color: string;
  fillColor: string;
  fillOpacity: number;
}

const PALETTE = {
  lines: {
    color: "#42A5F5",
    fillColor: "#42A5F5",
    fillOpacity: 0.12,
  },
  channels: {
    color: "#AB47BC",
    fillColor: "#AB47BC",
    fillOpacity: 0.10,
  },
  fibonacci: {
    color: "#FFB300",
    fillColor: "#FFB300",
    fillOpacity: 0.08,
  },
  shapes: {
    color: "#26C6DA",
    fillColor: "#26C6DA",
    fillOpacity: 0.12,
  },
  patterns: {
    color: "#7E57C2",
    fillColor: "#7E57C2",
    fillOpacity: 0.10,
  },
  forecast: {
    color: "#29B6F6",
    fillColor: "#29B6F6",
    fillOpacity: 0.10,
  },
  measurement: {
    color: "#FF7043",
    fillColor: "#FF7043",
    fillOpacity: 0.10,
  },
  text: {
    color: "#FFFFFF",
    fillColor: "#FFFFFF",
    fillOpacity: 0.10,
  },
};

export function drawingToolPalette(
  type: DrawingType,
): DrawingToolPalette {
  switch (type) {
    case "PARALLEL_CHANNEL":
    case "PRICE_CHANNEL":
    case "REGRESSION_CHANNEL":
      return PALETTE.channels;

    case "FIB_RETRACEMENT":
    case "FIB_EXTENSION":
    case "FIB_PROJECTION":
    case "FIB_TIME":
    case "FIB_CHANNEL":
      return PALETTE.fibonacci;

    case "RECTANGLE":
    case "CIRCLE":
    case "TRIANGLE":
    case "WEDGE":
    case "POLYLINE":
      return PALETTE.shapes;

    case "ABCD":
    case "XABCD":
    case "HEAD_SHOULDERS":
      return PALETTE.patterns;

    case "FORECAST":
    case "PROJECTION":
      return PALETTE.forecast;

    case "MEASURE_PRICE":
    case "MEASURE_TIME":
    case "MEASURE_PRICE_TIME":
    case "MEASURE_RANGE":
      return PALETTE.measurement;

    case "TEXT":
    case "NOTE":
    case "CALLOUT":
    case "PRICE_LABEL":
      return PALETTE.text;

    case "EXTENDED_LINE":
    case "CROSS_LINE":
    case "TREND_LINE":
    case "HORIZONTAL_LINE":
    case "VERTICAL_LINE":
    case "RAY":
    case "ARROW":
      return PALETTE.lines;

    case "LONG_POSITION":
      return {
        color: "#26A69A",
        fillColor: "#26A69A",
        fillOpacity: 0.18,
      };

    case "SHORT_POSITION":
      return {
        color: "#EF5350",
        fillColor: "#EF5350",
        fillOpacity: 0.18,
      };

    case "SELECT":
    default:
      return PALETTE.lines;
  }
}
