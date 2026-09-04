import { describe, expect, it } from "vitest";
import {
  addDrawing,
  createDrawing,
  createDrawingState,
  selectDrawing,
} from "../state";
import {
  applyDrawingKeyboardAction,
  selectDrawingAtPoint,
} from "../drawing-engine";

function makeDrawing() {
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
};

describe("MKT-UI-010 keyboard and selection", () => {
  it("selects a drawing at the cursor", () => {
    const drawing = makeDrawing();

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    const selected = selectDrawingAtPoint(
      state,
      { x: 150, y: 495 },
      context,
    );

    expect(selected.selectedDrawingId).toBe(
      drawing.id,
    );
  });

  it("clears selection when clicking empty space", () => {
    const drawing = makeDrawing();

    const state = selectDrawing(
      addDrawing(createDrawingState(), drawing),
      drawing.id,
    );

    const cleared = selectDrawingAtPoint(
      state,
      { x: 900, y: 50 },
      context,
    );

    expect(cleared.selectedDrawingId).toBeNull();
  });

  it("Escape clears selection", () => {
    const drawing = makeDrawing();

    const state = selectDrawing(
      addDrawing(createDrawingState(), drawing),
      drawing.id,
    );

    const next = applyDrawingKeyboardAction(
      state,
      "ESCAPE",
    );

    expect(next.selectedDrawingId).toBeNull();
  });

  it("Escape is a no-op without selection", () => {
    const state = createDrawingState();

    expect(
      applyDrawingKeyboardAction(
        state,
        "ESCAPE",
      ),
    ).toBe(state);
  });

  it("Delete removes the selected drawing", () => {
    const drawing = makeDrawing();

    const state = selectDrawing(
      addDrawing(createDrawingState(), drawing),
      drawing.id,
    );

    const next = applyDrawingKeyboardAction(
      state,
      "DELETE",
    );

    expect(next.drawings).toHaveLength(0);
    expect(next.selectedDrawingId).toBeNull();
  });

  it("arrow keys nudge the selected drawing", () => {
    const drawing = makeDrawing();

    const state = selectDrawing(
      addDrawing(createDrawingState(), drawing),
      drawing.id,
    );

    const right = applyDrawingKeyboardAction(
      state,
      "MOVE_RIGHT",
      { time: 2, price: 5 },
    );

    expect(right.drawings[0]?.points[0]).toEqual({
      time: 12,
      price: 100,
    });

    const up = applyDrawingKeyboardAction(
      right,
      "MOVE_UP",
      { time: 2, price: 5 },
    );

    expect(up.drawings[0]?.points[0]).toEqual({
      time: 12,
      price: 105,
    });
  });

  it("keyboard mutation preserves locked drawings", () => {
    const drawing = {
      ...makeDrawing(),
      locked: true,
    };

    const state = selectDrawing(
      addDrawing(createDrawingState(), drawing),
      drawing.id,
    );

    expect(
      applyDrawingKeyboardAction(
        state,
        "MOVE_RIGHT",
      ),
    ).toBe(state);

    expect(
      applyDrawingKeyboardAction(
        state,
        "DELETE",
      ),
    ).toBe(state);
  });
});
