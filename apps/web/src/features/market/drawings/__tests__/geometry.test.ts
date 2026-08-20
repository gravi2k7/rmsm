import { describe, expect, it } from "vitest";
import {
  drawingPointEquals,
  isPointInsideRect,
  isPointNearSegment,
  normalizeRect,
  pointDistance,
  pointToSegmentDistance,
} from "../geometry";

describe("drawing geometry", () => {
  it("normalizes rectangles regardless of point order", () => {
    expect(
      normalizeRect(
        { x: 100, y: 200 },
        { x: 20, y: 50 },
      ),
    ).toEqual({
      left: 20,
      top: 50,
      right: 100,
      bottom: 200,
    });
  });

  it("calculates point distance", () => {
    expect(
      pointDistance(
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ),
    ).toBe(5);
  });

  it("calculates distance from a point to a segment", () => {
    expect(
      pointToSegmentDistance(
        { x: 5, y: 3 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ),
    ).toBe(3);
  });

  it("detects a point near a segment", () => {
    expect(
      isPointNearSegment(
        { x: 5, y: 4 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        5,
      ),
    ).toBe(true);
  });

  it("detects points inside rectangles", () => {
    const rect = normalizeRect(
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    );

    expect(
      isPointInsideRect({ x: 50, y: 50 }, rect),
    ).toBe(true);

    expect(
      isPointInsideRect({ x: 150, y: 50 }, rect),
    ).toBe(false);
  });

  it("compares drawing points", () => {
    expect(
      drawingPointEquals(
        { time: 100, price: 50 },
        { time: 100, price: 50 },
      ),
    ).toBe(true);

    expect(
      drawingPointEquals(
        { time: 100, price: 50 },
        { time: 101, price: 50 },
      ),
    ).toBe(false);
  });
});
