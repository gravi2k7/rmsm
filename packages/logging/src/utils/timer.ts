import { performance } from "node:perf_hooks";

/**
 * Execution timer. Uses `performance.now()` (monotonic, sub-millisecond,
 * built into Node — not `Date.now()`, which can jump backward on a system
 * clock adjustment and would produce a nonsensical negative duration).
 */
export class Timer {
  private readonly startedAt: number;
  private stoppedAt: number | null = null;

  private constructor(startedAt: number) {
    this.startedAt = startedAt;
  }

  static start(): Timer {
    return new Timer(performance.now());
  }

  /** Stops the timer (idempotent — subsequent calls return the same
   * duration rather than measuring a new interval) and returns the
   * elapsed time in milliseconds. */
  stop(): number {
    if (this.stoppedAt === null) this.stoppedAt = performance.now();
    return this.stoppedAt - this.startedAt;
  }

  /** Elapsed time so far, without stopping the timer — for progress
   * logging mid-operation. */
  elapsedMs(): number {
    return (this.stoppedAt ?? performance.now()) - this.startedAt;
  }
}

/** Times a synchronous or asynchronous function, returning both its
 * result and the elapsed milliseconds — the common "log how long this
 * took" case without manually pairing `Timer.start()`/`stop()` calls. */
export async function time<T>(fn: () => T | Promise<T>): Promise<{ result: T; durationMs: number }> {
  const timer = Timer.start();
  const result = await fn();
  return { result, durationMs: timer.stop() };
}
