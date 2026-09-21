export type DrawingType =
  | "SELECT"
  | "TREND_LINE"
  | "HORIZONTAL_LINE"
  | "VERTICAL_LINE"
  | "RAY"
  | "EXTENDED_LINE"
  | "CROSS_LINE"
  | "RECTANGLE"
  | "CIRCLE"
  | "TRIANGLE"
  | "WEDGE"
  | "POLYLINE"
  | "ARROW"
  | "TEXT"
  | "NOTE"
  | "CALLOUT"
  | "PRICE_LABEL"
  | "PARALLEL_CHANNEL"
  | "PRICE_CHANNEL"
  | "REGRESSION_CHANNEL"
  | "FIB_RETRACEMENT"
  | "FIB_EXTENSION"
  | "FIB_PROJECTION"
  | "FIB_TIME"
  | "FIB_CHANNEL"
  | "ABCD"
  | "XABCD"
  | "HEAD_SHOULDERS"
  | "FORECAST"
  | "PROJECTION"
  | "MEASURE_PRICE"
  | "MEASURE_TIME"
  | "MEASURE_PRICE_TIME"
  | "MEASURE_RANGE"
  | "LONG_POSITION"
  | "SHORT_POSITION";

export type DrawingLineStyle =
  | "solid"
  | "dashed"
  | "dotted";

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingStyle {
  color: string;
  width: number;
  lineStyle: DrawingLineStyle;
  opacity: number;

  /**
   * Optional for backward compatibility with drawings saved before
   * rectangle fill properties were introduced.
   */
  fillColor?: string;
  fillOpacity?: number;
}

export interface DrawingBase {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  style: DrawingStyle;
  locked: boolean;
  visible: boolean;
  zIndex: number;

  /**
   * Optional text-like drawing properties.
   *
   * These remain optional for backward compatibility with drawings
   * created before editable text content was introduced.
   */
  text?: string;
  fontSize?: number;
}

export interface TextDrawing extends DrawingBase {
  type: "TEXT";
  points: [DrawingPoint];
  text: string;
  fontSize: number;
}

export type Drawing = DrawingBase | TextDrawing;

export interface DrawingToolDefinition {
  type: DrawingType;
  label: string;
  minPoints: number;
  maxPoints: number;
}

export interface DrawingState {
  drawings: Drawing[];
  activeTool: DrawingType;
  selectedDrawingId: string | null;
}

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: "#2962FF",
  width: 1,
  lineStyle: "solid",
  opacity: 1,
  fillColor: "#2962FF",
  fillOpacity: 0.15,
};


export type DrawingInteractionKind =
  | "NONE"
  | "DRAWING"
  | "HANDLE";

export interface DrawingInteractionTarget {
  drawingId: string;
  kind: DrawingInteractionKind;
  pointIndex?: number;
}

export interface DrawingNudge {
  time: number;
  price: number;
}
