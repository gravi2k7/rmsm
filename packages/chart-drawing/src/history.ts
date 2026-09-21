import type { DrawingState } from "./types";

export interface DrawingHistory {
  past: DrawingState[];
  present: DrawingState;
  future: DrawingState[];
}

export function createHistory(
  initial: DrawingState,
): DrawingHistory {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function commitHistory(
  history: DrawingHistory,
  next: DrawingState,
): DrawingHistory {
  return {
    past: [...history.past, history.present],
    present: next,
    future: [],
  };
}

export function undo(
  history: DrawingHistory,
): DrawingHistory {
  const previous = history.past.at(-1);

  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(
  history: DrawingHistory,
): DrawingHistory {
  const next = history.future[0];

  if (!next) {
    return history;
  }

  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}
