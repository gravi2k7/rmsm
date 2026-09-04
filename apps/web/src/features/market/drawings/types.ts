export type DrawingType =
  | "SELECT"
  | "TREND_LINE"
  | "HORIZONTAL_LINE"
  | "VERTICAL_LINE"
  | "RAY"
  | "RECTANGLE"
  | "ARROW"
  | "TEXT"
  | "PARALLEL_CHANNEL"
  | "PRICE_CHANNEL"
  | "REGRESSION_CHANNEL"
  | "FIB_RETRACEMENT"
  | "FIB_EXTENSION"
  | "FIB_PROJECTION"
  | "FIB_TIME"
  | "ABCD"
  | "XABCD"
  | "HEAD_SHOULDERS"
  | "TRIANGLE"
  | "WEDGE"
  | "FORECAST"
  | "PROJECTION"
  | "MEASURE_PRICE"
  | "MEASURE_TIME"
  | "MEASURE_PRICE_TIME"
  | "MEASURE_RANGE";

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
