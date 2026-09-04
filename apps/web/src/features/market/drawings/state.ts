import type {
  Drawing,
  DrawingPoint,
  DrawingState,
  DrawingStyle,
  DrawingType,
} from "./types";
import { DEFAULT_DRAWING_STYLE } from "./types";

export function createDrawingState(
  activeTool: DrawingType = "SELECT",
): DrawingState {
  return {
    drawings: [],
    activeTool,
    selectedDrawingId: null,
  };
}

export function createDrawing(
  type: DrawingType,
  points: DrawingPoint[],
  options: Partial<
    Pick<Drawing, "id" | "locked" | "visible" | "zIndex">
  > & {
    style?: Partial<DrawingStyle>;
  } = {},
): Drawing {
  return {
    id:
      options.id ??
      `drawing-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    type,
    points: [...points],
    style: {
      ...DEFAULT_DRAWING_STYLE,
      ...options.style,
    },
    locked: options.locked ?? false,
    visible: options.visible ?? true,
    zIndex: options.zIndex ?? 0,
  };
}

export function addDrawing(
  state: DrawingState,
  drawing: Drawing,
): DrawingState {
  return {
    ...state,
    drawings: [...state.drawings, drawing],
    selectedDrawingId: drawing.id,
  };
}

export function updateDrawing(
  state: DrawingState,
  id: string,
  patch: Partial<Drawing>,
): DrawingState {
  return {
    ...state,
    drawings: state.drawings.map((drawing) =>
      drawing.id === id
        ? { ...drawing, ...patch }
        : drawing,
    ),
  };
}


export function duplicateDrawing(
  state: DrawingState,
  id: string,
): DrawingState {
  const source = state.drawings.find(
    (drawing) => drawing.id === id,
  );

  if (!source) {
    return state;
  }

  const duplicated: Drawing = {
    ...source,
    id: `drawing-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,
    points: source.points.map((point) => ({
      ...point,
    })),
    style: {
      ...source.style,
    },
  };

  return {
    ...state,
    drawings: [...state.drawings, duplicated],
    selectedDrawingId: duplicated.id,
  };
}

export function setDrawingVisibility(
  state: DrawingState,
  id: string,
  visible: boolean,
): DrawingState {
  return updateDrawing(state, id, { visible });
}

export function setDrawingLocked(
  state: DrawingState,
  id: string,
  locked: boolean,
): DrawingState {
  return updateDrawing(state, id, { locked });
}

function reorderDrawing(
  state: DrawingState,
  id: string,
  direction: -1 | 1,
): DrawingState {
  const index = state.drawings.findIndex(
    (drawing) => drawing.id === id,
  );

  if (index < 0) {
    return state;
  }

  const targetIndex = index + direction;

  if (
    targetIndex < 0 ||
    targetIndex >= state.drawings.length
  ) {
    return state;
  }

  const drawings = [...state.drawings];

  const current = drawings[index]!;
  const target = drawings[targetIndex]!;

  drawings[index] = {
    ...target,
    zIndex: current.zIndex,
  };

  drawings[targetIndex] = {
    ...current,
    zIndex: target.zIndex,
  };

  return {
    ...state,
    drawings,
  };
}

export function bringDrawingForward(
  state: DrawingState,
  id: string,
): DrawingState {
  return reorderDrawing(state, id, 1);
}

export function sendDrawingBackward(
  state: DrawingState,
  id: string,
): DrawingState {
  return reorderDrawing(state, id, -1);
}

export function bringDrawingToFront(
  state: DrawingState,
  id: string,
): DrawingState {
  const index = state.drawings.findIndex(
    (drawing) => drawing.id === id,
  );

  if (index < 0 || index === state.drawings.length - 1) {
    return state;
  }

  const drawings = [...state.drawings];
  const [drawing] = drawings.splice(index, 1);

  if (!drawing) {
    return state;
  }

  const maxZ = Math.max(
    -1,
    ...drawings.map((candidate) => candidate.zIndex),
  );

  drawings.push({
    ...drawing,
    zIndex: maxZ + 1,
  });

  return {
    ...state,
    drawings,
  };
}

export function sendDrawingToBack(
  state: DrawingState,
  id: string,
): DrawingState {
  const index = state.drawings.findIndex(
    (drawing) => drawing.id === id,
  );

  if (index <= 0) {
    return state;
  }

  const drawings = [...state.drawings];
  const [drawing] = drawings.splice(index, 1);

  if (!drawing) {
    return state;
  }

  const minZ = Math.min(
    1,
    ...drawings.map((candidate) => candidate.zIndex),
  );

  drawings.unshift({
    ...drawing,
    zIndex: minZ - 1,
  });

  return {
    ...state,
    drawings,
  };
}

export function removeDrawing(
  state: DrawingState,
  id: string,
): DrawingState {
  return {
    ...state,
    drawings: state.drawings.filter(
      (drawing) => drawing.id !== id,
    ),
    selectedDrawingId:
      state.selectedDrawingId === id
        ? null
        : state.selectedDrawingId,
  };
}

export function selectDrawing(
  state: DrawingState,
  id: string | null,
): DrawingState {
  return {
    ...state,
    selectedDrawingId: id,
  };
}

export function setActiveTool(
  state: DrawingState,
  tool: DrawingType,
): DrawingState {
  return {
    ...state,
    activeTool: tool,
    selectedDrawingId:
      tool === "SELECT" ? state.selectedDrawingId : null,
  };
}
