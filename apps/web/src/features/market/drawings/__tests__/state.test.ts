import { describe, expect, it } from "vitest";
import {
  addDrawing,
  bringDrawingForward,
  bringDrawingToFront,
  createDrawing,
  createDrawingState,
  duplicateDrawing,
  removeDrawing,
  selectDrawing,
  sendDrawingBackward,
  sendDrawingToBack,
  setActiveTool,
  setDrawingLocked,
  setDrawingVisibility,
  updateDrawing,
} from "../state";

describe("drawing state", () => {
  it("creates an empty state", () => {
    expect(createDrawingState()).toEqual({
      drawings: [],
      activeTool: "SELECT",
      selectedDrawingId: null,
    });
  });

  it("creates and adds a drawing", () => {
    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      { id: "line-1" },
    );

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    expect(state.drawings).toHaveLength(1);
    expect(state.drawings[0]?.id).toBe("line-1");
    expect(state.selectedDrawingId).toBe("line-1");
  });

  it("updates a drawing", () => {
    const drawing = createDrawing(
      "HORIZONTAL_LINE",
      [{ time: 100, price: 10 }],
      { id: "line-1" },
    );

    const state = updateDrawing(
      addDrawing(createDrawingState(), drawing),
      "line-1",
      {
        locked: true,
        visible: false,
      },
    );

    expect(state.drawings[0]?.locked).toBe(true);
    expect(state.drawings[0]?.visible).toBe(false);
  });

  it("removes a selected drawing", () => {
    const drawing = createDrawing(
      "VERTICAL_LINE",
      [{ time: 100, price: 10 }],
      { id: "line-1" },
    );

    const state = removeDrawing(
      addDrawing(createDrawingState(), drawing),
      "line-1",
    );

    expect(state.drawings).toHaveLength(0);
    expect(state.selectedDrawingId).toBeNull();
  });

  it("changes active tool", () => {
    const state = setActiveTool(
      createDrawingState(),
      "RECTANGLE",
    );

    expect(state.activeTool).toBe("RECTANGLE");
    expect(state.selectedDrawingId).toBeNull();
  });

  it("selects a drawing", () => {
    const state = selectDrawing(
      createDrawingState(),
      "drawing-1",
    );

    expect(state.selectedDrawingId).toBe(
      "drawing-1",
    );
  });

  it("duplicates a drawing immutably and selects the copy", () => {
    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 100, price: 10 },
        { time: 200, price: 20 },
      ],
      {
        id: "line-1",
        zIndex: 4,
      },
    );

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    const next = duplicateDrawing(
      state,
      "line-1",
    );

    expect(next.drawings).toHaveLength(2);
    expect(next.drawings[0]?.id).toBe("line-1");
    expect(next.drawings[1]?.id).not.toBe("line-1");
    expect(next.drawings[1]?.points).toEqual(
      drawing.points,
    );
    expect(next.selectedDrawingId).toBe(
      next.drawings[1]?.id,
    );
    expect(state.drawings).toHaveLength(1);
  });

  it("toggles visibility and lock state", () => {
    const drawing = createDrawing(
      "HORIZONTAL_LINE",
      [{ time: 100, price: 10 }],
      { id: "line-1" },
    );

    const state = addDrawing(
      createDrawingState(),
      drawing,
    );

    const hidden = setDrawingVisibility(
      state,
      "line-1",
      false,
    );

    const locked = setDrawingLocked(
      hidden,
      "line-1",
      true,
    );

    expect(locked.drawings[0]?.visible).toBe(false);
    expect(locked.drawings[0]?.locked).toBe(true);
    expect(state.drawings[0]?.visible).toBe(true);
    expect(state.drawings[0]?.locked).toBe(false);
  });

  it("moves drawings forward and backward", () => {
    const first = createDrawing(
      "TREND_LINE",
      [
        { time: 1, price: 1 },
        { time: 2, price: 2 },
      ],
      { id: "first", zIndex: 0 },
    );

    const second = createDrawing(
      "RAY",
      [
        { time: 3, price: 3 },
        { time: 4, price: 4 },
      ],
      { id: "second", zIndex: 1 },
    );

    let state = createDrawingState();
    state = addDrawing(state, first);
    state = addDrawing(state, second);

    state = sendDrawingBackward(
      state,
      "second",
    );

    expect(state.drawings.map((d) => d.id)).toEqual([
      "second",
      "first",
    ]);

    state = bringDrawingForward(
      state,
      "second",
    );

    expect(state.drawings.map((d) => d.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("brings a drawing to the front and sends it to the back", () => {
    const drawings = [
      createDrawing(
        "TREND_LINE",
        [
          { time: 1, price: 1 },
          { time: 2, price: 2 },
        ],
        { id: "a", zIndex: 0 },
      ),
      createDrawing(
        "RAY",
        [
          { time: 3, price: 3 },
          { time: 4, price: 4 },
        ],
        { id: "b", zIndex: 1 },
      ),
      createDrawing(
        "RECTANGLE",
        [
          { time: 5, price: 5 },
          { time: 6, price: 6 },
        ],
        { id: "c", zIndex: 2 },
      ),
    ];

    let state = createDrawingState();

    for (const drawing of drawings) {
      state = addDrawing(state, drawing);
    }

    state = bringDrawingToFront(
      state,
      "a",
    );

    expect(state.drawings.map((d) => d.id)).toEqual([
      "b",
      "c",
      "a",
    ]);

    state = sendDrawingToBack(
      state,
      "a",
    );

    expect(state.drawings.map((d) => d.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("ignores management operations for unknown drawings", () => {
    const state = createDrawingState();

    expect(
      duplicateDrawing(state, "missing"),
    ).toBe(state);

    expect(
      setDrawingVisibility(
        state,
        "missing",
        false,
      ),
    ).toStrictEqual(state);

    expect(
      setDrawingLocked(
        state,
        "missing",
        true,
      ),
    ).toStrictEqual(state);

    expect(
      bringDrawingForward(
        state,
        "missing",
      ),
    ).toBe(state);

    expect(
      sendDrawingBackward(
        state,
        "missing",
      ),
    ).toBe(state);
  });

});
