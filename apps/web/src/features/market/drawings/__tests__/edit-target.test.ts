import { describe, expect, it } from "vitest";

import {
  getDrawingEditTarget,
} from "../drawing-engine";
import {
  DEFAULT_DRAWING_STYLE,
  type Drawing,
  type DrawingState,
} from "../types";

const context = {
  width: 1000,
  height: 600,
  timeToX: (time: number) => time,
  priceToY: (price: number) => price,
};

function drawing(
  overrides: Partial<Drawing> & Pick<Drawing, "type" | "points">,
): Drawing {
  return {
    id: overrides.id ?? `${overrides.type}-1`,
    type: overrides.type,
    points: overrides.points,
    style: overrides.style ?? DEFAULT_DRAWING_STYLE,
    locked: overrides.locked ?? false,
    visible: overrides.visible ?? true,
    zIndex: overrides.zIndex ?? 0,
  } as Drawing;
}

function state(drawings: Drawing[]): DrawingState {
  return {
    drawings,
    activeTool: "SELECT",
    selectedDrawingId: null,
  };
}

describe("getDrawingEditTarget", () => {
  it("returns MOVE for a horizontal line", () => {
    const line = drawing({
      type: "HORIZONTAL_LINE",
      id: "horizontal-1",
      points: [{ time: 100, price: 200 }],
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 500, y: 204 },
        context,
      ),
    ).toEqual({
      drawingId: "horizontal-1",
      mode: "MOVE",
    });
  });

  it("returns MOVE for a vertical line", () => {
    const line = drawing({
      type: "VERTICAL_LINE",
      id: "vertical-1",
      points: [{ time: 300, price: 200 }],
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 305, y: 400 },
        context,
      ),
    ).toEqual({
      drawingId: "vertical-1",
      mode: "MOVE",
    });
  });

  it("returns ENDPOINT for a trend-line endpoint", () => {
    const line = drawing({
      type: "TREND_LINE",
      id: "trend-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 101, y: 101 },
        context,
      ),
    ).toEqual({
      drawingId: "trend-1",
      mode: "ENDPOINT",
      pointIndex: 0,
    });
  });

  it("returns ENDPOINT for the second trend-line endpoint", () => {
    const line = drawing({
      type: "TREND_LINE",
      id: "trend-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 497, y: 498 },
        context,
      ),
    ).toEqual({
      drawingId: "trend-1",
      mode: "ENDPOINT",
      pointIndex: 1,
    });
  });

  it("returns MOVE when the trend line body is hit away from endpoints", () => {
    const line = drawing({
      type: "TREND_LINE",
      id: "trend-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 300, y: 304 },
        context,
      ),
    ).toEqual({
      drawingId: "trend-1",
      mode: "MOVE",
    });
  });

  it("returns ENDPOINT for a ray endpoint", () => {
    const ray = drawing({
      type: "RAY",
      id: "ray-1",
      points: [
        { time: 100, price: 100 },
        { time: 400, price: 300 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([ray]),
        { x: 400, y: 300 },
        context,
      ),
    ).toEqual({
      drawingId: "ray-1",
      mode: "ENDPOINT",
      pointIndex: 1,
    });
  });

  it("returns ENDPOINT for a rectangle corner", () => {
    const rectangle = drawing({
      type: "RECTANGLE",
      id: "rectangle-1",
      points: [
        { time: 100, price: 100 },
        { time: 400, price: 300 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([rectangle]),
        { x: 101, y: 101 },
        context,
      ),
    ).toEqual({
      drawingId: "rectangle-1",
      mode: "ENDPOINT",
      pointIndex: 0,
    });
  });

  it("returns MOVE for an arrow body", () => {
    const arrow = drawing({
      type: "ARROW",
      id: "arrow-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([arrow]),
        { x: 300, y: 304 },
        context,
      ),
    ).toEqual({
      drawingId: "arrow-1",
      mode: "MOVE",
    });
  });

  it("returns ENDPOINT for Fibonacci retracement anchors", () => {
    const drawingValue = drawing({
      type: "FIB_RETRACEMENT",
      id: "fib-retracement-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 101, y: 101 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-retracement-1",
      mode: "ENDPOINT",
      pointIndex: 0,
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 499, y: 499 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-retracement-1",
      mode: "ENDPOINT",
      pointIndex: 1,
    });
  });

  it("returns ENDPOINT for Fibonacci extension anchors", () => {
    const drawingValue = drawing({
      type: "FIB_EXTENSION",
      id: "fib-extension-1",
      points: [
        { time: 100, price: 100 },
        { time: 300, price: 300 },
        { time: 500, price: 200 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 299, y: 301 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-extension-1",
      mode: "ENDPOINT",
      pointIndex: 1,
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 499, y: 201 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-extension-1",
      mode: "ENDPOINT",
      pointIndex: 2,
    });
  });

  it("returns ENDPOINT for Fibonacci projection anchors", () => {
    const drawingValue = drawing({
      type: "FIB_PROJECTION",
      id: "fib-projection-1",
      points: [
        { time: 100, price: 100 },
        { time: 300, price: 300 },
        { time: 500, price: 200 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 101, y: 101 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-projection-1",
      mode: "ENDPOINT",
      pointIndex: 0,
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 501, y: 199 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-projection-1",
      mode: "ENDPOINT",
      pointIndex: 2,
    });
  });

  it("returns ENDPOINT for Fibonacci time anchors", () => {
    const drawingValue = drawing({
      type: "FIB_TIME",
      id: "fib-time-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 150 },
      ],
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 101, y: 101 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-time-1",
      mode: "ENDPOINT",
      pointIndex: 0,
    });

    expect(
      getDrawingEditTarget(
        state([drawingValue]),
        { x: 499, y: 149 },
        context,
      ),
    ).toEqual({
      drawingId: "fib-time-1",
      mode: "ENDPOINT",
      pointIndex: 1,
    });
  });

  it("does not return an edit target for a locked drawing", () => {
    const line = drawing({
      type: "TREND_LINE",
      id: "locked-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
      locked: true,
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 300, y: 304 },
        context,
      ),
    ).toBeNull();
  });

  it("does not return an edit target for an invisible drawing", () => {
    const line = drawing({
      type: "TREND_LINE",
      id: "hidden-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
      visible: false,
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 300, y: 304 },
        context,
      ),
    ).toBeNull();
  });

  it("returns the topmost editable drawing", () => {
    const lower = drawing({
      type: "HORIZONTAL_LINE",
      id: "lower",
      points: [{ time: 100, price: 200 }],
      zIndex: 1,
    });

    const higher = drawing({
      type: "HORIZONTAL_LINE",
      id: "higher",
      points: [{ time: 100, price: 200 }],
      zIndex: 10,
    });

    expect(
      getDrawingEditTarget(
        state([lower, higher]),
        { x: 500, y: 200 },
        context,
      ),
    ).toEqual({
      drawingId: "higher",
      mode: "MOVE",
    });
  });

  it("returns null when no editable drawing is hit", () => {
    const line = drawing({
      type: "HORIZONTAL_LINE",
      id: "line-1",
      points: [{ time: 100, price: 200 }],
    });

    expect(
      getDrawingEditTarget(
        state([line]),
        { x: 500, y: 300 },
        context,
      ),
    ).toBeNull();
  });
});
