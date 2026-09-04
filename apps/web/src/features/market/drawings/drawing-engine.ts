import type {
  Drawing,
  DrawingPoint,
  DrawingState,
  DrawingType,
  DrawingNudge,
} from "./types";
import {
  addDrawing,
  createDrawing,
  removeDrawing,
  selectDrawing,
  updateDrawing,
} from "./state";
import {
  isPointNearSegment,
  normalizeRect,
  pointToSegmentDistance,
  type Point2D,
} from "./geometry";

import { arrowTool } from "./tools/arrow";
import { horizontalLineTool } from "./tools/horizontal-line";
import { rayTool } from "./tools/ray";
import { rectangleTool } from "./tools/rectangle";
import { selectTool } from "./tools/select";
import { textTool } from "./tools/text";
import { trendLineTool } from "./tools/trend-line";
import { verticalLineTool } from "./tools/vertical-line";
import { advancedDrawingTools } from "./tools/advanced";
import {
  fibonacciDrawingTools,
  fibonacciExtensionLevels,
  fibonacciProjectionLevels,
  fibonacciRetracementLevels,
  fibonacciTimeLevels,
} from "./tools/fibonacci";

export interface DrawingToolAdapter {
  type: DrawingType;
  minPoints: number;
  maxPoints: number;
  isComplete?: (points: DrawingPoint[]) => boolean;
  hit?: (drawing: Drawing) => boolean;
}

const DRAWING_TOOL_ADAPTERS: readonly DrawingToolAdapter[] = [
  trendLineTool,
  horizontalLineTool,
  verticalLineTool,
  rayTool,
  rectangleTool,
  arrowTool,
  textTool,
  ...fibonacciDrawingTools,
  ...advancedDrawingTools,
  selectTool,
];

export function getDrawingToolAdapter(
  type: DrawingType,
): DrawingToolAdapter {
  const adapter = DRAWING_TOOL_ADAPTERS.find(
    (tool) => tool.type === type,
  );

  if (!adapter) {
    throw new Error(`Unsupported drawing tool: ${type}`);
  }

  return adapter;
}

export function isDrawingComplete(
  type: DrawingType,
  points: DrawingPoint[],
): boolean {
  const adapter = getDrawingToolAdapter(type);

  if (!adapter.isComplete) {
    return false;
  }

  return adapter.isComplete(points);
}

export function createDrawingFromTool(
  type: DrawingType,
  points: DrawingPoint[],
): Drawing {
  const adapter = getDrawingToolAdapter(type);

  if (points.length > adapter.maxPoints) {
    throw new Error(
      `Too many points for ${type}: expected at most ${adapter.maxPoints}, received ${points.length}`,
    );
  }

  if (
    !adapter.isComplete ||
    !adapter.isComplete(points)
  ) {
    throw new Error(
      `Incomplete drawing for ${type}: expected ${adapter.minPoints}-${adapter.maxPoints} points, received ${points.length}`,
    );
  }

  return createDrawing(type, points);
}

export interface ScreenPointToDrawingPointContext {
  state: DrawingState;
  timeToX: (time: number) => number | null;
  priceToY: (price: number) => number | null;
  xToTime: (x: number) => number | null;
  yToPrice: (y: number) => number | null;
}

export function screenPointToDrawingPoint(
  context: ScreenPointToDrawingPointContext,
  x: number,
  y: number,
): DrawingPoint {
  const time = context.xToTime(x);
  const price = context.yToPrice(y);

  if (time === null || time === undefined) {
    throw new Error(
      "Unable to convert screen x coordinate to chart time",
    );
  }

  if (price === null || price === undefined) {
    throw new Error(
      "Unable to convert screen y coordinate to chart price",
    );
  }

  return {
    time: Number(time),
    price: Number(price),
  };
}

export interface DrawingHitTestContext {
  width: number;
  height: number;
  timeToX: (time: number) => number | null;
  priceToY: (price: number) => number | null;
}

function pointToScreen(
  point: DrawingPoint,
  context: DrawingHitTestContext,
): Point2D | null {
  const x = context.timeToX(point.time);
  const y = context.priceToY(point.price);

  if (x === null || y === null) {
    return null;
  }

  return { x, y };
}

function lineEndForRay(
  start: Point2D,
  end: Point2D,
  width: number,
  height: number,
): Point2D {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < 0.0001) {
    return {
      x: end.x,
      y: dy >= 0 ? height : 0,
    };
  }

  const scale =
    dx > 0
      ? (width - start.x) / dx
      : -start.x / dx;

  const factor = Math.max(1, scale);

  return {
    x: Math.max(-width, Math.min(width * 2, start.x + dx * factor)),
    y: Math.max(-height, Math.min(height * 2, start.y + dy * factor)),
  };
}

function channelSegments(
  points: Point2D[],
  width: number,
  height: number,
): Array<[Point2D, Point2D]> {
  if (points.length < 3) {
    return [];
  }

  const start = points[0]!;
  const end = points[1]!;
  const offsetPoint = points[2]!;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 0.0001) {
    return [];
  }

  const projection =
    ((offsetPoint.x - start.x) * dx +
      (offsetPoint.y - start.y) * dy) /
    lengthSquared;

  const projected = {
    x: start.x + projection * dx,
    y: start.y + projection * dy,
  };

  const offset = {
    x: offsetPoint.x - projected.x,
    y: offsetPoint.y - projected.y,
  };

  const parallelStart = {
    x: start.x + offset.x,
    y: start.y + offset.y,
  };

  const parallelEnd = {
    x: end.x + offset.x,
    y: end.y + offset.y,
  };

  const extend = (
    a: Point2D,
    b: Point2D,
  ): [Point2D, Point2D] => {
    const vx = b.x - a.x;
    const vy = b.y - a.y;

    if (Math.abs(vx) < 0.0001) {
      return [
        { x: a.x, y: 0 },
        { x: a.x, y: height },
      ];
    }

    const slope = vy / vx;

    const y0 = a.y + slope * (0 - a.x);
    const y1 =
      a.y + slope * (width - a.x);

    return [
      { x: 0, y: y0 },
      { x: width, y: y1 },
    ];
  };

  return [
    extend(start, end),
    extend(parallelStart, parallelEnd),
  ];
}

function fibonacciPriceLevelHit(
  drawing: Drawing,
  cursor: Point2D,
  context: DrawingHitTestContext,
  tolerance: number,
): boolean {
  if (
    drawing.type !== "FIB_RETRACEMENT" &&
    drawing.type !== "FIB_EXTENSION" &&
    drawing.type !== "FIB_PROJECTION"
  ) {
    return false;
  }

  if (
    (drawing.type === "FIB_RETRACEMENT" &&
      drawing.points.length < 2) ||
    (drawing.type !== "FIB_RETRACEMENT" &&
      drawing.points.length < 3)
  ) {
    return false;
  }

  const levels =
    drawing.type === "FIB_RETRACEMENT"
      ? fibonacciRetracementLevels(
          drawing.points[0]!,
          drawing.points[1]!,
        )
      : drawing.type === "FIB_EXTENSION"
        ? fibonacciExtensionLevels(
            drawing.points[0]!,
            drawing.points[1]!,
            drawing.points[2]!,
          )
        : fibonacciProjectionLevels(
            drawing.points[0]!,
            drawing.points[1]!,
            drawing.points[2]!,
          );

  return levels.some((level) => {
    if (level.price === undefined) {
      return false;
    }

    const y = context.priceToY(level.price);

    if (y === null) {
      return false;
    }

    return Math.abs(cursor.y - y) <= tolerance;
  });
}

function fibonacciTimeLevelHit(
  drawing: Drawing,
  cursor: Point2D,
  context: DrawingHitTestContext,
  tolerance: number,
): boolean {
  if (
    drawing.type !== "FIB_TIME" ||
    drawing.points.length < 2
  ) {
    return false;
  }

  const levels = fibonacciTimeLevels(
    drawing.points[0]!,
    drawing.points[1]!,
  );

  return levels.some((level) => {
    if (level.time === undefined) {
      return false;
    }

    const x = context.timeToX(level.time);

    if (x === null) {
      return false;
    }

    return Math.abs(cursor.x - x) <= tolerance;
  });
}

function drawingHit(
  drawing: Drawing,
  cursor: Point2D,
  context: DrawingHitTestContext,
  tolerance: number,
): boolean {
  if (!drawing.visible || drawing.points.length === 0) {
    return false;
  }

  const points = drawing.points
    .map((point) => pointToScreen(point, context))
    .filter((point): point is Point2D => point !== null);

  if (points.length === 0) {
    return false;
  }

  if (
    fibonacciPriceLevelHit(
      drawing,
      cursor,
      context,
      tolerance,
    ) ||
    fibonacciTimeLevelHit(
      drawing,
      cursor,
      context,
      tolerance,
    )
  ) {
    return true;
  }

  switch (drawing.type) {
    case "HORIZONTAL_LINE":
      return Math.abs(cursor.y - points[0]!.y) <= tolerance;

    case "VERTICAL_LINE":
      return Math.abs(cursor.x - points[0]!.x) <= tolerance;

    case "TREND_LINE":
    case "ARROW":
      return points.length >= 2 &&
        isPointNearSegment(
          cursor,
          points[0]!,
          points[1]!,
          tolerance,
        );

    case "PARALLEL_CHANNEL":
    case "PRICE_CHANNEL":
    case "REGRESSION_CHANNEL":
      if (points.length < 3) {
        return false;
      }

      return channelSegments(
        points,
        context.width,
        context.height,
      ).some(([start, end]) =>
        pointToSegmentDistance(
          cursor,
          start,
          end,
        ) <= tolerance,
      );

    case "RAY":
      if (points.length < 2) {
        return false;
      }

      return isPointNearSegment(
        cursor,
        points[0]!,
        lineEndForRay(
          points[0]!,
          points[1]!,
          context.width,
          context.height,
        ),
        tolerance,
      );

    case "RECTANGLE":
      if (points.length < 2) {
        return false;
      }

      {
        const rect = normalizeRect(points[0]!, points[1]!);

        const edges = [
          [
            { x: rect.left, y: rect.top },
            { x: rect.right, y: rect.top },
          ],
          [
            { x: rect.right, y: rect.top },
            { x: rect.right, y: rect.bottom },
          ],
          [
            { x: rect.right, y: rect.bottom },
            { x: rect.left, y: rect.bottom },
          ],
          [
            { x: rect.left, y: rect.bottom },
            { x: rect.left, y: rect.top },
          ],
        ] as const;

        return edges.some(([start, end]) =>
          pointToSegmentDistance(cursor, start, end) <= tolerance,
        );
      }

    case "TEXT":
      return pointToSegmentDistance(
        cursor,
        points[0]!,
        points[0]!,
      ) <= Math.max(tolerance, drawing.style.width + 8);

    case "SELECT":
      return false;

    case "ABCD":
    case "XABCD":
    case "HEAD_SHOULDERS":
    case "TRIANGLE":
    case "WEDGE":
    case "FORECAST":
    case "PROJECTION":
    case "MEASURE_PRICE":
    case "MEASURE_TIME":
    case "MEASURE_PRICE_TIME":
    case "MEASURE_RANGE":
      return advancedDrawingHit(
        drawing,
        cursor,
        context,
        tolerance,
      );

    default:
      return false;
  }
}


export interface DrawingHandleHitTestContext
  extends DrawingHitTestContext {
  handleRadius?: number;
}

export function hitTestDrawingPointHandles(
  state: DrawingState,
  x: number,
  y: number,
  context: DrawingHandleHitTestContext,
): { drawingId: string; pointIndex: number } | null {
  const radius = context.handleRadius ?? 8;

  const selectedId = state.selectedDrawingId;

  if (!selectedId) {
    return null;
  }

  const drawing = state.drawings.find(
    (candidate) =>
      candidate.id === selectedId &&
      candidate.visible,
  );

  if (!drawing || drawing.locked) {
    return null;
  }

  for (let index = 0; index < drawing.points.length; index += 1) {
    const point = drawing.points[index];

    if (!point) {
      continue;
    }

    const screen = pointToScreen(point, context);

    if (!screen) {
      continue;
    }

    const distance = pointToSegmentDistance(
      { x, y },
      screen,
      screen,
    );

    if (distance <= radius) {
      return {
        drawingId: drawing.id,
        pointIndex: index,
      };
    }
  }

  return null;
}

export function resolveDrawingInteractionTarget(
  state: DrawingState,
  x: number,
  y: number,
  context: DrawingHitTestContext,
): {
  drawingId: string;
  kind: "DRAWING" | "HANDLE";
  pointIndex?: number;
} | null {
  const handle = hitTestDrawingPointHandles(
    state,
    x,
    y,
    context,
  );

  if (handle) {
    return {
      drawingId: handle.drawingId,
      kind: "HANDLE",
      pointIndex: handle.pointIndex,
    };
  }

  const drawingId = hitTestDrawings(
    state,
    { x, y },
    context,
  );

  if (!drawingId) {
    return null;
  }

  return {
    drawingId,
    kind: "DRAWING",
  };
}

export function moveDrawingByDelta(
  state: DrawingState,
  drawingId: string,
  delta: DrawingNudge,
): DrawingState {
  const drawing = state.drawings.find(
    (candidate) => candidate.id === drawingId,
  );

  if (!drawing || drawing.locked) {
    return state;
  }

  if (delta.time === 0 && delta.price === 0) {
    return state;
  }

  return updateDrawing(state, drawingId, {
    points: drawing.points.map((point) => ({
      time: point.time + delta.time,
      price: point.price + delta.price,
    })),
  });
}

export function moveDrawingPoint(
  state: DrawingState,
  drawingId: string,
  pointIndex: number,
  point: DrawingPoint,
): DrawingState {
  const drawing = state.drawings.find(
    (candidate) => candidate.id === drawingId,
  );

  if (
    !drawing ||
    drawing.locked ||
    pointIndex < 0 ||
    pointIndex >= drawing.points.length
  ) {
    return state;
  }

  const current = drawing.points[pointIndex];

  if (
    current?.time === point.time &&
    current?.price === point.price
  ) {
    return state;
  }

  const points = drawing.points.map(
    (candidate, index) =>
      index === pointIndex ? { ...point } : candidate,
  );

  return updateDrawing(state, drawingId, { points });
}

export type DrawingKeyboardAction =
  | "DELETE"
  | "ESCAPE"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "MOVE_UP"
  | "MOVE_DOWN";

export interface DrawingKeyboardDelta {
  time: number;
  price: number;
}

export function applyDrawingKeyboardAction(
  state: DrawingState,
  action: DrawingKeyboardAction,
  delta: DrawingKeyboardDelta = {
    time: 1,
    price: 1,
  },
): DrawingState {
  const selectedId = state.selectedDrawingId;

  if (action === "ESCAPE") {
    if (selectedId === null) {
      return state;
    }

    return selectDrawing(state, null);
  }

  if (!selectedId) {
    return state;
  }

  const selectedDrawing = state.drawings.find(
    (drawing) => drawing.id === selectedId,
  );

  if (!selectedDrawing) {
    return state;
  }

  if (selectedDrawing.locked) {
    return state;
  }

  if (action === "DELETE") {
    return removeDrawing(state, selectedId);
  }

  switch (action) {
    case "MOVE_LEFT":
      return moveDrawingByDelta(
        state,
        selectedId,
        {
          time: -Math.abs(delta.time),
          price: 0,
        },
      );

    case "MOVE_RIGHT":
      return moveDrawingByDelta(
        state,
        selectedId,
        {
          time: Math.abs(delta.time),
          price: 0,
        },
      );

    case "MOVE_UP":
      return moveDrawingByDelta(
        state,
        selectedId,
        {
          time: 0,
          price: Math.abs(delta.price),
        },
      );

    case "MOVE_DOWN":
      return moveDrawingByDelta(
        state,
        selectedId,
        {
          time: 0,
          price: -Math.abs(delta.price),
        },
      );

    default:
      return state;
  }
}

export function selectDrawingAtPoint(
  state: DrawingState,
  cursor: Point2D,
  context: DrawingHitTestContext,
): DrawingState {
  const drawingId = hitTestDrawings(
    state,
    cursor,
    context,
  );

  return selectDrawing(
    state,
    drawingId,
  );
}

export function hitTestDrawings(
  state: DrawingState,
  cursor: Point2D,
  context: DrawingHitTestContext,
  tolerance = 8,
): string | null {
  const candidates = state.drawings
    .filter((drawing) => drawing.visible)
    .slice()
    .sort((a, b) => {
      if (a.zIndex !== b.zIndex) {
        return b.zIndex - a.zIndex;
      }

      return state.drawings.indexOf(b) - state.drawings.indexOf(a);
    });

  const hit = candidates.find((drawing) =>
    drawingHit(drawing, cursor, context, tolerance),
  );

  return hit?.id ?? null;
}

export type DrawingEditMode =
  | "MOVE"
  | "ENDPOINT";

export interface DrawingEditTarget {
  drawingId: string;
  mode: DrawingEditMode;
  pointIndex?: number;
}

const ENDPOINT_EDITABLE_TYPES = new Set<DrawingType>([
  "TREND_LINE",
  "RAY",
  "RECTANGLE",
  "ARROW",
  "PARALLEL_CHANNEL",
  "PRICE_CHANNEL",
  "REGRESSION_CHANNEL",
  "FIB_RETRACEMENT",
  "FIB_EXTENSION",
  "FIB_PROJECTION",
  "FIB_TIME",
]);

function getEndpointHit(
  drawing: Drawing,
  cursor: Point2D,
  context: DrawingHitTestContext,
  tolerance: number,
): number | null {
  if (!ENDPOINT_EDITABLE_TYPES.has(drawing.type)) {
    return null;
  }

  for (let index = 0; index < drawing.points.length; index += 1) {
    const screenPoint = pointToScreen(
      drawing.points[index]!,
      context,
    );

    if (!screenPoint) {
      continue;
    }

    if (
      pointToSegmentDistance(
        cursor,
        screenPoint,
        screenPoint,
      ) <= tolerance
    ) {
      return index;
    }
  }

  return null;
}

export function getDrawingEditTarget(
  state: DrawingState,
  cursor: Point2D,
  context: DrawingHitTestContext,
  tolerance = 8,
): DrawingEditTarget | null {
  const candidates = state.drawings
    .filter(
      (drawing) =>
        drawing.visible &&
        !drawing.locked &&
        drawing.points.length > 0,
    )
    .slice()
    .sort((a, b) => {
      if (a.zIndex !== b.zIndex) {
        return b.zIndex - a.zIndex;
      }

      return (
        state.drawings.indexOf(b) -
        state.drawings.indexOf(a)
      );
    });

  for (const drawing of candidates) {
    const endpointIndex = getEndpointHit(
      drawing,
      cursor,
      context,
      tolerance,
    );

    if (endpointIndex !== null) {
      return {
        drawingId: drawing.id,
        mode: "ENDPOINT",
        pointIndex: endpointIndex,
      };
    }

    if (
      drawingHit(
        drawing,
        cursor,
        context,
        tolerance,
      )
    ) {
      return {
        drawingId: drawing.id,
        mode: "MOVE",
      };
    }
  }

  return null;
}

export interface DrawingEditDelta {
  time: number;
  price: number;
}

export function applyDrawingEdit(
  state: DrawingState,
  target: DrawingEditTarget,
  delta: DrawingEditDelta,
): DrawingState {
  const drawing = state.drawings.find(
    (candidate) => candidate.id === target.drawingId,
  );

  if (!drawing || drawing.locked) {
    return state;
  }

  if (target.mode === "MOVE") {
    return updateDrawing(
      state,
      drawing.id,
      {
        points: drawing.points.map((point) => ({
          time: point.time + delta.time,
          price: point.price + delta.price,
        })),
      },
    );
  }

  if (
    target.pointIndex === undefined ||
    target.pointIndex < 0 ||
    target.pointIndex >= drawing.points.length
  ) {
    return state;
  }

  return updateDrawing(
    state,
    drawing.id,
    {
      points: drawing.points.map(
        (point, index) =>
          index === target.pointIndex
            ? {
                time: point.time + delta.time,
                price: point.price + delta.price,
              }
            : point,
      ),
    },
  );
}

function advancedDrawingSegments(
  drawing: Drawing,
): Array<[DrawingPoint, DrawingPoint]> {
  const points = drawing.points;

  if (points.length < 2) {
    return [];
  }

  switch (drawing.type) {
    case "ABCD":
    case "XABCD":
    case "HEAD_SHOULDERS":
      return points.slice(1).map((point, index) => [
        points[index]!,
        point,
      ]);

    case "TRIANGLE":
    case "WEDGE":
      if (points.length < 4) {
        return [];
      }

      return [
        [points[0]!, points[1]!],
        [points[2]!, points[3]!],
      ];

    default:
      return [];
  }
}

function advancedDrawingHit(
  drawing: Drawing,
  cursor: Point2D,
  context: DrawingHitTestContext,
  tolerance: number,
): boolean {
  const segments = advancedDrawingSegments(drawing);

  if (segments.length > 0) {
    return segments.some(([start, end]) => {
      const a = pointToScreen(start, context);
      const b = pointToScreen(end, context);

      if (!a || !b) {
        return false;
      }

      return isPointNearSegment(
        cursor,
        a,
        b,
        tolerance,
      );
    });
  }

  if (
    drawing.type === "FORECAST" ||
    drawing.type === "PROJECTION" ||
    drawing.type === "MEASURE_PRICE" ||
    drawing.type === "MEASURE_TIME" ||
    drawing.type === "MEASURE_PRICE_TIME" ||
    drawing.type === "MEASURE_RANGE"
  ) {
    if (drawing.points.length < 2) {
      return false;
    }

    const a = pointToScreen(
      drawing.points[0]!,
      context,
    );
    const b = pointToScreen(
      drawing.points[1]!,
      context,
    );

    if (!a || !b) {
      return false;
    }

    return isPointNearSegment(
      cursor,
      a,
      b,
      tolerance,
    );
  }

  return false;
}

export interface AddDrawingPointContext
  extends ScreenPointToDrawingPointContext {}

export interface DrawingInteractionResult {
  state: DrawingState;
  pendingPoints: DrawingPoint[];
  completed: boolean;
}

export function addDrawingInteractionPoint(
  state: DrawingState,
  point: DrawingPoint,
  pendingPoints: DrawingPoint[] = [],
): DrawingInteractionResult {
  const type = state.activeTool;

  if (type === "SELECT") {
    return {
      state,
      pendingPoints: [],
      completed: false,
    };
  }

  const adapter = getDrawingToolAdapter(type);

  if (adapter.maxPoints <= 0) {
    return {
      state,
      pendingPoints: [],
      completed: false,
    };
  }

  const points = [...pendingPoints, point];

  if (points.length > adapter.maxPoints) {
    throw new Error(
      `Too many points for ${type}: expected at most ${adapter.maxPoints}, received ${points.length}`,
    );
  }

  if (!isDrawingComplete(type, points)) {
    return {
      state,
      pendingPoints: points,
      completed: false,
    };
  }

  const completedDrawing = createDrawingFromTool(
    type,
    points,
  );

  return {
    state: {
      ...addDrawing(state, completedDrawing),
      activeTool: "SELECT",
    },
    pendingPoints: [],
    completed: true,
  };
}

export function addDrawingPoint(
  context: AddDrawingPointContext,
  point: DrawingPoint,
): DrawingState {
  const type = context.state.activeTool;

  if (type === "SELECT") {
    return context.state;
  }

  const adapter = getDrawingToolAdapter(type);

  if (adapter.maxPoints <= 0) {
    return context.state;
  }

  const existingPoints =
    context.state.drawings.find(
      (drawing) =>
        drawing.id === context.state.selectedDrawingId &&
        drawing.type === type,
    )?.points ?? [];

  const points = [...existingPoints, point];

  if (points.length > adapter.maxPoints) {
    throw new Error(
      `Too many points for ${type}: expected at most ${adapter.maxPoints}, received ${points.length}`,
    );
  }

  if (!isDrawingComplete(type, points)) {
    return context.state;
  }

  return addDrawing(
    context.state,
    createDrawingFromTool(type, points),
  );
}
