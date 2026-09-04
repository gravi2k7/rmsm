import { describe, expect, it } from "vitest";
import {
  createDrawingFromTool,
  getDrawingToolAdapter,
  isDrawingComplete,
} from "../drawing-engine";

const pointA = { time: 100, price: 10 };
const pointB = { time: 200, price: 20 };

describe("drawing tool implementations", () => {
  it("completes two-point tools at two points", () => {
    const tools = [
      "TREND_LINE",
      "RAY",
      "RECTANGLE",
      "ARROW",
    ] as const;

    for (const tool of tools) {
      expect(
        isDrawingComplete(tool, [pointA]),
      ).toBe(false);

      expect(
        isDrawingComplete(tool, [pointA, pointB]),
      ).toBe(true);
    }
  });

  it("completes one-point tools at one point", () => {
    const tools = [
      "HORIZONTAL_LINE",
      "VERTICAL_LINE",
      "TEXT",
    ] as const;

    for (const tool of tools) {
      expect(
        isDrawingComplete(tool, []),
      ).toBe(false);

      expect(
        isDrawingComplete(tool, [pointA]),
      ).toBe(true);
    }
  });

  it("creates a trend line", () => {
    const drawing = createDrawingFromTool(
      "TREND_LINE",
      [pointA, pointB],
    );

    expect(drawing.type).toBe("TREND_LINE");
    expect(drawing.points).toEqual([
      pointA,
      pointB,
    ]);
  });

  it("creates horizontal and vertical lines", () => {
    const horizontal = createDrawingFromTool(
      "HORIZONTAL_LINE",
      [pointA],
    );

    const vertical = createDrawingFromTool(
      "VERTICAL_LINE",
      [pointA],
    );

    expect(horizontal.type).toBe(
      "HORIZONTAL_LINE",
    );
    expect(vertical.type).toBe(
      "VERTICAL_LINE",
    );
  });

  it("creates ray, rectangle and arrow", () => {
    for (const tool of [
      "RAY",
      "RECTANGLE",
      "ARROW",
    ] as const) {
      const drawing = createDrawingFromTool(
        tool,
        [pointA, pointB],
      );

      expect(drawing.type).toBe(tool);
      expect(drawing.points).toHaveLength(2);
    }
  });

  it("creates text anchor", () => {
    const drawing = createDrawingFromTool(
      "TEXT",
      [pointA],
    );

    expect(drawing.type).toBe("TEXT");
    expect(drawing.points).toEqual([pointA]);
  });

  it("rejects incomplete drawings", () => {
    expect(() =>
      createDrawingFromTool(
        "TREND_LINE",
        [pointA],
      ),
    ).toThrow();

    expect(() =>
      createDrawingFromTool(
        "TEXT",
        [],
      ),
    ).toThrow();
  });

  it("rejects excessive points", () => {
    expect(() =>
      createDrawingFromTool(
        "TREND_LINE",
        [pointA, pointB, pointA],
      ),
    ).toThrow();
  });

  it("returns the registered adapter", () => {
    expect(
      getDrawingToolAdapter("RECTANGLE").type,
    ).toBe("RECTANGLE");
  });
});
