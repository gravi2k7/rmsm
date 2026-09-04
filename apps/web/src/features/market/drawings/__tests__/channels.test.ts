import { describe, expect, it } from "vitest";

import {
  applyDrawingEdit,
  getDrawingEditTarget,
  hitTestDrawings,
} from "../drawing-engine";
import {
  addDrawing,
  createDrawing,
  createDrawingState,
} from "../state";

const context = {
  width: 1000,
  height: 600,
  timeToX: (time: number) => time,
  priceToY: (price: number) => price,
};

function channel(
  type:
    | "PARALLEL_CHANNEL"
    | "PRICE_CHANNEL"
    | "REGRESSION_CHANNEL",
) {
  return createDrawing(
    type,
    [
      { time: 100, price: 100 },
      { time: 500, price: 300 },
      { time: 100, price: 150 },
    ],
    { id: `${type}-1` },
  );
}

describe("MKT-UI-006 channels", () => {
  it.each([
    "PARALLEL_CHANNEL",
    "PRICE_CHANNEL",
    "REGRESSION_CHANNEL",
  ] as const)(
    "hit-tests %s base and parallel lines",
    (type) => {
      const drawing = channel(type);
      const state = addDrawing(
        createDrawingState(),
        drawing,
      );

      expect(
        hitTestDrawings(
          state,
          { x: 300, y: 200 },
          context,
        ),
      ).toBe(drawing.id);

      expect(
        hitTestDrawings(
          state,
          { x: 300, y: 250 },
          context,
        ),
      ).toBe(drawing.id);
    },
  );

  it("does not hit outside both channel boundaries", () => {
    const drawing = channel("PARALLEL_CHANNEL");

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    expect(
      hitTestDrawings(
        state,
        { x: 300, y: 300 },
        context,
      ),
    ).toBeNull();
  });

  it("returns endpoint edit target for channel endpoints", () => {
    const drawing = channel("PRICE_CHANNEL");

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    expect(
      getDrawingEditTarget(
        state,
        { x: 100, y: 100 },
        context,
      ),
    ).toEqual({
      drawingId: drawing.id,
      mode: "ENDPOINT",
      pointIndex: 0,
    });
  });

  it("moves the complete channel", () => {
    const drawing = channel("REGRESSION_CHANNEL");

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      state,
      {
        drawingId: drawing.id,
        mode: "MOVE",
      },
      {
        time: 10,
        price: 20,
      },
    );

    expect(result.drawings[0]?.points).toEqual([
      { time: 110, price: 120 },
      { time: 510, price: 320 },
      { time: 110, price: 170 },
    ]);
  });

  it("moves only the selected endpoint", () => {
    const drawing = channel("PARALLEL_CHANNEL");

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      state,
      {
        drawingId: drawing.id,
        mode: "ENDPOINT",
        pointIndex: 2,
      },
      {
        time: 25,
        price: 10,
      },
    );

    expect(result.drawings[0]?.points).toEqual([
      { time: 100, price: 100 },
      { time: 500, price: 300 },
      { time: 125, price: 160 },
    ]);
  });

  it("does not edit a locked channel", () => {
    const drawing = createDrawing(
      "PARALLEL_CHANNEL",
      [
        { time: 100, price: 100 },
        { time: 500, price: 300 },
        { time: 100, price: 150 },
      ],
      {
        id: "locked-channel",
        locked: true,
      },
    );

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    const result = applyDrawingEdit(
      state,
      {
        drawingId: drawing.id,
        mode: "MOVE",
      },
      {
        time: 10,
        price: 10,
      },
    );

    expect(result).toBe(state);
  });
});
