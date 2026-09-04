import { describe, expect, it } from "vitest";
import {
  createDrawing,
  createDrawingState,
  addDrawing,
  selectDrawing,
} from "../state";
import {
  hitTestDrawingPointHandles,
  moveDrawingByDelta,
  moveDrawingPoint,
  resolveDrawingInteractionTarget,
} from "../drawing-engine";

function drawing() {
  return createDrawing("TREND_LINE", [
    { time: 10, price: 100 },
    { time: 20, price: 110 },
  ]);
}

const context = {
  width: 1000,
  height: 600,
  timeToX: (time: number) => time * 10,
  priceToY: (price: number) => 600 - price,
  xToTime: (x: number) => x / 10,
  yToPrice: (y: number) => 600 - y,
};

describe("MKT-UI-010 interaction", () => {
  it("resolves a selected endpoint handle", () => {
    const d = drawing();
    const state = selectDrawing(
      addDrawing(createDrawingState(), d),
      d.id,
    );

    expect(
      hitTestDrawingPointHandles(
        state,
        100,
        500,
        context,
      ),
    ).toEqual({
      drawingId: d.id,
      pointIndex: 0,
    });
  });

  it("resolves the drawing when no handle is hit", () => {
    const d = drawing();
    const state = addDrawing(
      createDrawingState(),
      d,
    );

    expect(
      resolveDrawingInteractionTarget(
        state,
        150,
        495,
        context,
      )?.drawingId,
    ).toBe(d.id);
  });

  it("moves an unlocked drawing", () => {
    const d = drawing();
    const state = addDrawing(
      createDrawingState(),
      d,
    );

    const moved = moveDrawingByDelta(
      state,
      d.id,
      { time: 2, price: 5 },
    );

    expect(moved.drawings[0]?.points).toEqual([
      { time: 12, price: 105 },
      { time: 22, price: 115 },
    ]);
  });

  it("moves one endpoint", () => {
    const d = drawing();
    const state = addDrawing(
      createDrawingState(),
      d,
    );

    const moved = moveDrawingPoint(
      state,
      d.id,
      1,
      { time: 30, price: 125 },
    );

    expect(moved.drawings[0]?.points).toEqual([
      { time: 10, price: 100 },
      { time: 30, price: 125 },
    ]);
  });

  it("does not mutate locked drawings", () => {
    const d = {
      ...drawing(),
      locked: true,
    };

    const state = addDrawing(
      createDrawingState(),
      d,
    );

    expect(
      moveDrawingByDelta(
        state,
        d.id,
        { time: 2, price: 5 },
      ),
    ).toBe(state);

    expect(
      moveDrawingPoint(
        state,
        d.id,
        0,
        { time: 99, price: 99 },
      ),
    ).toBe(state);
  });

  it("preserves identity for zero movement", () => {
    const d = drawing();
    const state = addDrawing(
      createDrawingState(),
      d,
    );

    expect(
      moveDrawingByDelta(
        state,
        d.id,
        { time: 0, price: 0 },
      ),
    ).toBe(state);
  });

  it("ignores invalid point indexes", () => {
    const d = drawing();
    const state = addDrawing(
      createDrawingState(),
      d,
    );

    expect(
      moveDrawingPoint(
        state,
        d.id,
        99,
        { time: 50, price: 50 },
      ),
    ).toBe(state);
  });
});

describe("one-shot drawing tools", () => {
  it("returns to SELECT after completing a drawing", async () => {
    const { addDrawingInteractionPoint } =
      await import("../drawing-engine");

    const state = createDrawingState("TREND_LINE");

    const first = addDrawingInteractionPoint(
      state,
      { time: 10, price: 100 },
      [],
    );

    expect(first.completed).toBe(false);
    expect(first.pendingPoints).toHaveLength(1);
    expect(first.state.activeTool).toBe("TREND_LINE");

    const second = addDrawingInteractionPoint(
      first.state,
      { time: 20, price: 110 },
      first.pendingPoints,
    );

    expect(second.completed).toBe(true);
    expect(second.pendingPoints).toHaveLength(0);
    expect(second.state.drawings).toHaveLength(1);
    expect(second.state.selectedDrawingId).toBe(
      second.state.drawings[0]?.id,
    );
    expect(second.state.activeTool).toBe("SELECT");

    const third = addDrawingInteractionPoint(
      second.state,
      { time: 30, price: 120 },
      [],
    );

    expect(third.completed).toBe(false);
    expect(third.state.drawings).toHaveLength(1);
    expect(third.state.activeTool).toBe("SELECT");
  });
});
