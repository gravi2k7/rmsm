import { describe, expect, it } from "vitest";

import { hitTestDrawings } from "../drawing-engine";
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

describe("hitTestDrawings", () => {
  it("selects a horizontal line", () => {
    const line = drawing({
      type: "HORIZONTAL_LINE",
      id: "horizontal-1",
      points: [{ time: 100, price: 200 }],
    });

    expect(
      hitTestDrawings(
        state([line]),
        { x: 500, y: 204 },
        context,
      ),
    ).toBe("horizontal-1");
  });

  it("selects a vertical line", () => {
    const line = drawing({
      type: "VERTICAL_LINE",
      id: "vertical-1",
      points: [{ time: 300, price: 200 }],
    });

    expect(
      hitTestDrawings(
        state([line]),
        { x: 305, y: 400 },
        context,
      ),
    ).toBe("vertical-1");
  });

  it("selects a trend line near its segment", () => {
    const line = drawing({
      type: "TREND_LINE",
      id: "trend-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
    });

    expect(
      hitTestDrawings(
        state([line]),
        { x: 300, y: 304 },
        context,
      ),
    ).toBe("trend-1");
  });

  it("does not select a trend line outside the tolerance", () => {
    const line = drawing({
      type: "TREND_LINE",
      id: "trend-1",
      points: [
        { time: 100, price: 100 },
        { time: 500, price: 500 },
      ],
    });

    expect(
      hitTestDrawings(
        state([line]),
        { x: 300, y: 330 },
        context,
      ),
    ).toBeNull();
  });

  it("selects a rectangle by its edge", () => {
    const rectangle = drawing({
      type: "RECTANGLE",
      id: "rectangle-1",
      points: [
        { time: 100, price: 100 },
        { time: 400, price: 300 },
      ],
    });

    expect(
      hitTestDrawings(
        state([rectangle]),
        { x: 250, y: 104 },
        context,
      ),
    ).toBe("rectangle-1");
  });

  it("selects a ray in its forward direction", () => {
    const ray = drawing({
      type: "RAY",
      id: "ray-1",
      points: [
        { time: 100, price: 100 },
        { time: 400, price: 300 },
      ],
    });

    expect(
      hitTestDrawings(
        state([ray]),
        { x: 700, y: 500 },
        context,
      ),
    ).toBe("ray-1");
  });

  it("ignores invisible drawings", () => {
    const line = drawing({
      type: "HORIZONTAL_LINE",
      id: "hidden-1",
      points: [{ time: 100, price: 200 }],
      visible: false,
    });

    expect(
      hitTestDrawings(
        state([line]),
        { x: 500, y: 200 },
        context,
      ),
    ).toBeNull();
  });

  it("returns the highest z-index drawing when drawings overlap", () => {
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
      hitTestDrawings(
        state([lower, higher]),
        { x: 500, y: 200 },
        context,
      ),
    ).toBe("higher");
  });

  it("uses the later drawing when z-index is equal", () => {
    const first = drawing({
      type: "HORIZONTAL_LINE",
      id: "first",
      points: [{ time: 100, price: 200 }],
      zIndex: 1,
    });

    const second = drawing({
      type: "HORIZONTAL_LINE",
      id: "second",
      points: [{ time: 100, price: 200 }],
      zIndex: 1,
    });

    expect(
      hitTestDrawings(
        state([first, second]),
        { x: 500, y: 200 },
        context,
      ),
    ).toBe("second");
  });

  it("returns null when no drawing is hit", () => {
    const line = drawing({
      type: "HORIZONTAL_LINE",
      id: "line-1",
      points: [{ time: 100, price: 200 }],
    });

    expect(
      hitTestDrawings(
        state([line]),
        { x: 500, y: 300 },
        context,
      ),
    ).toBeNull();
  });
});
