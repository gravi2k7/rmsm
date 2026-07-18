import { Timeframe, TIMEFRAME_DURATION_SECONDS } from "../enums/timeframe.enum";
import { InvalidTimeframeError } from "../errors/market.errors";

/**
 * Behavior around a `Timeframe` value — duration and candle-boundary
 * alignment. Kept separate from the bare `Timeframe` enum (`enums/
 * timeframe.enum.ts`) so the enum itself stays a plain, serializable
 * discriminator while this class owns the actual logic that operates on
 * it (e.g. `Candle`/`CandleFactory` both need "what's the boundary
 * timestamp for this instant", and neither should reimplement it).
 *
 * Not a `ValueObject`/`Entity` from `@rmsm/core` — a timeframe has no
 * identity (`Entity`) and no multi-field structural equality to compute
 * (`ValueObject`); it's a single enum value plus pure functions over it,
 * so a plain class is the honest shape rather than reaching for a base
 * class that doesn't add anything here.
 */
export class TimeframeInfo {
  private constructor(readonly value: Timeframe) {}

  static from(value: Timeframe): TimeframeInfo {
    if (!Object.values(Timeframe).includes(value)) {
      throw new InvalidTimeframeError(String(value));
    }
    return new TimeframeInfo(value);
  }

  /** Fixed duration in seconds, or `undefined` for `TICK` (no fixed
   * duration) and `MN1` (a calendar month has no fixed duration). */
  get durationSeconds(): number | undefined {
    return TIMEFRAME_DURATION_SECONDS[this.value];
  }

  /** Whether this timeframe has a fixed, calendar-independent duration —
   * `false` for `TICK` and `MN1`. */
  hasFixedDuration(): boolean {
    return this.durationSeconds !== undefined;
  }

  /**
   * The candle-open boundary timestamp containing `instant` — e.g. for
   * `M5`, `14:07:32` aligns to `14:05:00`. Throws for `TICK` (every tick
   * is its own boundary, there's no time-based alignment to compute) and
   * `MN1` (calendar-month alignment isn't a fixed-duration calculation
   * this method performs — a caller needing month boundaries should
   * align by calendar month directly rather than through this generic
   * fixed-duration path).
   */
  alignToBoundary(instant: Date): Date {
    const duration = this.durationSeconds;
    if (duration === undefined) {
      throw new InvalidTimeframeError(`${this.value} has no fixed duration to align a boundary against.`);
    }
    const epochSeconds = Math.floor(instant.getTime() / 1000);
    const boundarySeconds = epochSeconds - (epochSeconds % duration);
    return new Date(boundarySeconds * 1000);
  }

  /** The boundary timestamp of the *next* candle after `instant`'s own
   * boundary — i.e. `alignToBoundary(instant) + durationSeconds`. */
  nextBoundary(instant: Date): Date {
    const duration = this.durationSeconds;
    if (duration === undefined) {
      throw new InvalidTimeframeError(`${this.value} has no fixed duration to compute a next boundary for.`);
    }
    return new Date(this.alignToBoundary(instant).getTime() + duration * 1000);
  }
}
