export interface BacktestReplayState {
  cursor: number;
  playing: boolean;
  speed: number;
}

export interface BacktestReplayController {
  getState(): BacktestReplayState;
  play(): void;
  pause(): void;
  toggle(): void;
  stepForward(): void;
  stepBackward(): void;
  reset(): void;
  setCursor(cursor: number): void;
  setSpeed(speed: number): void;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}

const DEFAULT_SPEED = 1;

function clampCursor(cursor: number, length: number): number {
  if (length <= 0) {
    return -1;
  }

  return Math.max(0, Math.min(cursor, length - 1));
}

function normalizeSpeed(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) {
    return DEFAULT_SPEED;
  }

  return speed;
}

export function createBacktestReplayController(
  candleCount: number,
  initialCursor = 0,
): BacktestReplayController {
  let state: BacktestReplayState = {
    cursor: clampCursor(initialCursor, candleCount),
    playing: false,
    speed: DEFAULT_SPEED,
  };

  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const stopTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startTimer = () => {
    stopTimer();

    const intervalMs = Math.max(
      16,
      Math.round(1000 / state.speed),
    );

    timer = setInterval(() => {
      const nextCursor = state.cursor + 1;

      state = {
        ...state,
        cursor: Math.min(
          nextCursor,
          candleCount - 1,
        ),
        playing:
          nextCursor < candleCount - 1,
      };

      if (!state.playing) {
        stopTimer();
      }

      emit();
    }, intervalMs);
  };

  return {
    getState() {
      return state;
    },

    play() {
      if (candleCount <= 0) {
        return;
      }

      if (state.cursor >= candleCount - 1) {
        state = {
          ...state,
          cursor: 0,
        };
      }

      state = {
        ...state,
        playing: true,
      };

      startTimer();
      emit();
    },

    pause() {
      stopTimer();

      if (!state.playing) {
        return;
      }

      state = {
        ...state,
        playing: false,
      };

      emit();
    },

    toggle() {
      if (state.playing) {
        this.pause();
      } else {
        this.play();
      }
    },

    stepForward() {
      stopTimer();

      const nextCursor = clampCursor(
        state.cursor + 1,
        candleCount,
      );

      state = {
        ...state,
        cursor: nextCursor,
        playing: false,
      };

      emit();
    },

    stepBackward() {
      stopTimer();

      const nextCursor = clampCursor(
        state.cursor - 1,
        candleCount,
      );

      state = {
        ...state,
        cursor: nextCursor,
        playing: false,
      };

      emit();
    },

    reset() {
      stopTimer();

      state = {
        ...state,
        cursor: clampCursor(0, candleCount),
        playing: false,
      };

      emit();
    },

    setCursor(cursor: number) {
      stopTimer();

      state = {
        ...state,
        cursor: clampCursor(cursor, candleCount),
        playing: false,
      };

      emit();
    },

    setSpeed(speed: number) {
      state = {
        ...state,
        speed: normalizeSpeed(speed),
      };

      if (state.playing) {
        startTimer();
      }

      emit();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    destroy() {
      stopTimer();
      listeners.clear();
    },
  };
}
