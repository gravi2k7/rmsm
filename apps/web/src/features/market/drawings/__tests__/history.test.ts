import { describe, expect, it } from "vitest";
import {
  commitHistory,
  createHistory,
  redo,
  undo,
} from "../history";
import {
  addDrawing,
  createDrawing,
  createDrawingState,
} from "../state";

describe("drawing history", () => {
  it("creates empty history", () => {
    const state = createDrawingState();
    const history = createHistory(state);

    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
    expect(history.present).toBe(state);
  });

  it("undoes the latest committed change", () => {
    const initial = createDrawingState();

    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      { id: "line-1" },
    );

    const changed = addDrawing(initial, drawing);
    const history = commitHistory(
      createHistory(initial),
      changed,
    );

    const result = undo(history);

    expect(result.present).toBe(initial);
    expect(result.future).toHaveLength(1);
  });

  it("redoes an undone change", () => {
    const initial = createDrawingState();

    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      { id: "line-1" },
    );

    const changed = addDrawing(initial, drawing);

    const history = commitHistory(
      createHistory(initial),
      changed,
    );

    const undone = undo(history);
    const redone = redo(undone);

    expect(redone.present).toBe(changed);
    expect(redone.future).toHaveLength(0);
  });

  it("does nothing when undo is unavailable", () => {
    const history = createHistory(
      createDrawingState(),
    );

    expect(undo(history)).toBe(history);
  });

  it("does nothing when redo is unavailable", () => {
    const history = createHistory(
      createDrawingState(),
    );

    expect(redo(history)).toBe(history);
  });
});
