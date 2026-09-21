import type { DrawingPoint } from "./types";

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function normalizeRect(
  a: Point2D,
  b: Point2D,
): Rect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

export function pointDistance(
  a: Point2D,
  b: Point2D,
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pointToSegmentDistance(
  point: Point2D,
  start: Point2D,
  end: Point2D,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return pointDistance(point, start);
  }

  const lengthSquared = dx * dx + dy * dy;

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx +
        (point.y - start.y) * dy) /
        lengthSquared,
    ),
  );

  return pointDistance(point, {
    x: start.x + t * dx,
    y: start.y + t * dy,
  });
}

export function isPointNearSegment(
  point: Point2D,
  start: Point2D,
  end: Point2D,
  tolerance = 6,
): boolean {
  return pointToSegmentDistance(point, start, end) <= tolerance;
}

export function isPointInsideRect(
  point: Point2D,
  rect: Rect,
): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

export function drawingPointEquals(
  a: DrawingPoint,
  b: DrawingPoint,
): boolean {
  return a.time === b.time && a.price === b.price;
}
