import { describe, expect, it } from "vitest";
import {
  addDrawingInteractionPoint,
  addDrawingPoint,
  screenPointToDrawingPoint,
} from "../drawing-engine";
import { createDrawingState } from "../state";

describe("drawing engine", () => {
  it("converts screen coordinates into chart coordinates", () => {
    const state = createDrawingState("HORIZONTAL_LINE");

    const point = screenPointToDrawingPoint(
      {
        state,
        timeToX: () => 100,
        priceToY: () => 100,
        xToTime: (x) => x * 10,
        yToPrice: (y) => y / 10,
      },
      20,
      50,
    );

    expect(point).toEqual({
      time: 200,
      price: 5,
    });
  });

  it("creates a drawing from a chart point", () => {
    const state = createDrawingState("HORIZONTAL_LINE");

    const result = addDrawingPoint(
      {
        state,
        timeToX: () => 100,
        priceToY: () => 100,
        xToTime: (x) => x,
        yToPrice: (y) => y,
      },
      {
        time: 100,
        price: 50,
      },
    );

    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]?.type).toBe(
      "HORIZONTAL_LINE",
    );
    expect(result.selectedDrawingId).toBe(
      result.drawings[0]?.id,
    );
  });


  it("keeps the first trend-line point pending", () => {
    const state = createDrawingState("TREND_LINE");

    const result = addDrawingInteractionPoint(
      state,
      { time: 100, price: 10 },
    );

    expect(result.completed).toBe(false);
    expect(result.pendingPoints).toEqual([
      { time: 100, price: 10 },
    ]);
    expect(result.state.drawings).toHaveLength(0);
  });

  it("commits a trend line after the second point", () => {
    const state = createDrawingState("TREND_LINE");

    const first = addDrawingInteractionPoint(
      state,
      { time: 100, price: 10 },
    );

    const second = addDrawingInteractionPoint(
      first.state,
      { time: 200, price: 20 },
      first.pendingPoints,
    );

    expect(second.completed).toBe(true);
    expect(second.pendingPoints).toEqual([]);
    expect(second.state.drawings).toHaveLength(1);
    expect(second.state.drawings[0]?.type).toBe(
      "TREND_LINE",
    );
    expect(second.state.drawings[0]?.points).toEqual([
      { time: 100, price: 10 },
      { time: 200, price: 20 },
    ]);
  });

  it("commits a horizontal line immediately", () => {
    const state = createDrawingState("HORIZONTAL_LINE");

    const result = addDrawingInteractionPoint(
      state,
      { time: 100, price: 50 },
    );

    expect(result.completed).toBe(true);
    expect(result.pendingPoints).toEqual([]);
    expect(result.state.drawings).toHaveLength(1);
    expect(result.state.drawings[0]?.points).toEqual([
      { time: 100, price: 50 },
    ]);
  });

  it("commits a rectangle after two points", () => {
    const state = createDrawingState("RECTANGLE");

    const first = addDrawingInteractionPoint(
      state,
      { time: 100, price: 50 },
    );

    expect(first.completed).toBe(false);
    expect(first.state.drawings).toHaveLength(0);

    const second = addDrawingInteractionPoint(
      first.state,
      { time: 200, price: 25 },
      first.pendingPoints,
    );

    expect(second.completed).toBe(true);
    expect(second.pendingPoints).toEqual([]);
    expect(second.state.drawings).toHaveLength(1);
    expect(second.state.drawings[0]?.type).toBe(
      "RECTANGLE",
    );
  });

  it("creates Fibonacci retracement after two points", () => {
    const state = createDrawingState("FIB_RETRACEMENT");

    const first = addDrawingInteractionPoint(
      state,
      { time: 100, price: 100 },
    );

    expect(first.completed).toBe(false);

    const second = addDrawingInteractionPoint(
      first.state,
      { time: 200, price: 200 },
      first.pendingPoints,
    );

    expect(second.completed).toBe(true);
    expect(second.pendingPoints).toEqual([]);
    expect(second.state.drawings).toHaveLength(1);
    expect(second.state.drawings[0]?.type).toBe(
      "FIB_RETRACEMENT",
    );
    expect(second.state.drawings[0]?.points).toEqual([
      { time: 100, price: 100 },
      { time: 200, price: 200 },
    ]);
  });

  it("creates Fibonacci extension after three points", () => {
    const state = createDrawingState("FIB_EXTENSION");

    const first = addDrawingInteractionPoint(
      state,
      { time: 100, price: 100 },
    );

    const second = addDrawingInteractionPoint(
      first.state,
      { time: 200, price: 200 },
      first.pendingPoints,
    );

    expect(second.completed).toBe(false);

    const third = addDrawingInteractionPoint(
      second.state,
      { time: 300, price: 150 },
      second.pendingPoints,
    );

    expect(third.completed).toBe(true);
    expect(third.state.drawings[0]?.type).toBe(
      "FIB_EXTENSION",
    );
    expect(third.state.drawings[0]?.points).toHaveLength(3);
  });

  it("creates Fibonacci projection after three points", () => {
    const state = createDrawingState("FIB_PROJECTION");

    const first = addDrawingInteractionPoint(
      state,
      { time: 100, price: 100 },
    );

    const second = addDrawingInteractionPoint(
      first.state,
      { time: 200, price: 200 },
      first.pendingPoints,
    );

    const third = addDrawingInteractionPoint(
      second.state,
      { time: 300, price: 150 },
      second.pendingPoints,
    );

    expect(third.completed).toBe(true);
    expect(third.state.drawings[0]?.type).toBe(
      "FIB_PROJECTION",
    );
    expect(third.state.drawings[0]?.points).toHaveLength(3);
  });

  it("creates Fibonacci time after two points", () => {
    const state = createDrawingState("FIB_TIME");

    const first = addDrawingInteractionPoint(
      state,
      { time: 100, price: 100 },
    );

    const second = addDrawingInteractionPoint(
      first.state,
      { time: 200, price: 150 },
      first.pendingPoints,
    );

    expect(second.completed).toBe(true);
    expect(second.state.drawings[0]?.type).toBe(
      "FIB_TIME",
    );
    expect(second.state.drawings[0]?.points).toHaveLength(2);
  });

  it("does not create a drawing for SELECT", () => {
    const state = createDrawingState("SELECT");

    const result = addDrawingInteractionPoint(
      state,
      { time: 100, price: 50 },
    );

    expect(result.completed).toBe(false);
    expect(result.pendingPoints).toEqual([]);
    expect(result.state).toBe(state);
  });

});
