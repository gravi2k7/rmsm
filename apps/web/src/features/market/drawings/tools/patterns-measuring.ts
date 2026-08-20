import type { DrawingPoint, DrawingType } from "../types";

export interface PatternSegment {
  start: DrawingPoint;
  end: DrawingPoint;
}

export interface Measurement {
  priceDelta: number;
  timeDelta: number;
  priceRange: number;
  direction: "UP" | "DOWN" | "FLAT";
}

export function measurement(
  a: DrawingPoint,
  b: DrawingPoint,
): Measurement {
  const priceDelta = b.price - a.price;
  const timeDelta = b.time - a.time;

  return {
    priceDelta,
    timeDelta,
    priceRange: Math.abs(priceDelta),
    direction:
      priceDelta > 0
        ? "UP"
        : priceDelta < 0
          ? "DOWN"
          : "FLAT",
  };
}

export function segmentsFromPoints(
  points: DrawingPoint[],
): PatternSegment[] {
  const segments: PatternSegment[] = [];

  for (let index = 1; index < points.length; index += 1) {
    segments.push({
      start: points[index - 1]!,
      end: points[index]!,
    });
  }

  return segments;
}

export function patternSegments(
  type: DrawingType,
  points: DrawingPoint[],
): PatternSegment[] {
  if (points.length < 2) {
    return [];
  }

  switch (type) {
    case "ABCD":
      return segmentsFromPoints(points.slice(0, 4));

    case "XABCD":
      return segmentsFromPoints(points.slice(0, 5));

    case "HEAD_SHOULDERS":
      return [
        { start: points[0]!, end: points[1]! },
        { start: points[1]!, end: points[2]! },
        { start: points[2]!, end: points[3]! },
        { start: points[3]!, end: points[4]! },
      ];

    case "TRIANGLE":
    case "WEDGE":
      if (points.length < 4) {
        return [];
      }

      return [
        { start: points[0]!, end: points[1]! },
        { start: points[2]!, end: points[3]! },
      ];

    default:
      return [];
  }
}

export function forecastEnd(
  points: DrawingPoint[],
): DrawingPoint | null {
  if (points.length < 2) {
    return null;
  }

  const start = points[0]!;
  const end = points[1]!;

  return {
    time: end.time + (end.time - start.time),
    price: end.price + (end.price - start.price),
  };
}

export function projectionEnd(
  points: DrawingPoint[],
): DrawingPoint | null {
  if (points.length < 2) {
    return null;
  }

  const start = points[0]!;
  const end = points[1]!;

  return {
    time: end.time + Math.abs(end.time - start.time),
    price: end.price + (end.price - start.price),
  };
}
