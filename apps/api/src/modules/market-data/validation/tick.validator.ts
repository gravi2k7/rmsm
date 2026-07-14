import type { NormalizedTick } from "../interfaces/normalized-market-data.interface";
import { InvalidTimestampError, InvalidVolumeError, InvalidPrecisionError } from "./errors/market-data-validation.error";

/** Business-rule checks on an already-normalized tick — see candle.validator.ts's class comment for the normalizer/validator split. */
export function validateTick(tick: NormalizedTick): void {
  if (!(tick.eventTime instanceof Date) || Number.isNaN(tick.eventTime.getTime())) {
    throw new InvalidTimestampError("eventTime is not a valid Date.", { tick });
  }

  const price = Number(tick.price);
  if (!(price > 0)) {
    throw new InvalidPrecisionError(`Tick price (${tick.price}) must be positive.`, { tick });
  }

  const size = Number(tick.size);
  if (size < 0) {
    throw new InvalidVolumeError(`Tick size (${tick.size}) cannot be negative.`, { tick });
  }
}
