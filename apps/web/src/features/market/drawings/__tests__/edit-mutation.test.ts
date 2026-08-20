import { describe, expect, it } from "vitest";

import {
  applyDrawingEdit,
  type DrawingEditTarget,
} from "../drawing-engine";
import {
  addDrawing,
  createDrawing,
  createDrawingState,
} from "../state";

describe("applyDrawingEdit", () => {
  it("moves every point for a MOVE target", () => {
    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      { id: "line-1" },
    );

    const initial = addDrawing(
      createDrawingState(),
      drawing,
    );

    const target: DrawingEditTarget = {
      drawingId: "line-1",
      mode: "MOVE",
    };

    const result = applyDrawingEdit(
      initial,
      target,
      { time: 25, price: 5 },
    );

    expect(result.drawings[0]?.points).toEqual([
      { time: 125, price: 15 },
      { time: 225, price: 25 },
    ]);
  });

  it("moves only the selected endpoint", () => {
    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      { id: "line-1" },
    );

    const initial = addDrawing(
      createDrawingState(),
      drawing,
    );

    const target: DrawingEditTarget = {
      drawingId: "line-1",
      mode: "ENDPOINT",
      pointIndex: 1,
    };

    const result = applyDrawingEdit(
      initial,
      target,
      { time: 25, price: 5 },
    );

    expect(result.drawings[0]?.points).toEqual([
      { time: 100, price: 10 },
      { time: 225, price: 25 },
    ]);
  });

  it("moves a horizontal line using the same point delta", () => {
    const drawing = createDrawing(
      "HORIZONTAL_LINE",
      [{ time: 100, price: 50 }],
      { id: "horizontal-1" },
    );

    const initial = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      initial,
      {
        drawingId: "horizontal-1",
        mode: "MOVE",
      },
      { time: 20, price: 10 },
    );

    expect(result.drawings[0]?.points).toEqual([
      { time: 120, price: 60 },
    ]);
  });

  it("moves a vertical line using the same point delta", () => {
    const drawing = createDrawing(
      "VERTICAL_LINE",
      [{ time: 100, price: 50 }],
      { id: "vertical-1" },
    );

    const initial = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      initial,
      {
        drawingId: "vertical-1",
        mode: "MOVE",
      },
      { time: 20, price: 10 },
    );

    expect(result.drawings[0]?.points).toEqual([
      { time: 120, price: 60 },
    ]);
  });

  it("does not mutate a locked drawing", () => {
    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      {
        id: "locked-1",
        locked: true,
      },
    );

    const initial = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      initial,
      {
        drawingId: "locked-1",
        mode: "MOVE",
      },
      { time: 25, price: 5 },
    );

    expect(result).toBe(initial);
    expect(result.drawings[0]?.points).toEqual([
      { time: 100, price: 10 },
      { time: 200, price: 20 },
    ]);
  });

  it("does not mutate when the drawing does not exist", () => {
    const initial = createDrawingState();

    const result = applyDrawingEdit(
      initial,
      {
        drawingId: "missing",
        mode: "MOVE",
      },
      { time: 25, price: 5 },
    );

    expect(result).toBe(initial);
  });

  it("does not mutate for an invalid endpoint index", () => {
    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      { id: "line-1" },
    );

    const initial = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      initial,
      {
        drawingId: "line-1",
        mode: "ENDPOINT",
        pointIndex: 5,
      },
      { time: 25, price: 5 },
    );

    expect(result).toBe(initial);
  });

  it("does not mutate the original drawing points", () => {
    const originalPoints = [
      { time: 100, price: 10 },
      { time: 200, price: 20 },
    ];

    const drawing = createDrawing(
      "TREND_LINE",
      originalPoints,
      { id: "line-1" },
    );

    const initial = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      initial,
      {
        drawingId: "line-1",
        mode: "MOVE",
      },
      { time: 25, price: 5 },
    );

    expect(originalPoints).toEqual([
      { time: 100, price: 10 },
      { time: 200, price: 20 },
    ]);

    expect(initial.drawings[0]?.points).toEqual([
      { time: 100, price: 10 },
      { time: 200, price: 20 },
    ]);

    expect(result.drawings[0]?.points).toEqual([
      { time: 125, price: 15 },
      { time: 225, price: 25 },
    ]);
  });
});
