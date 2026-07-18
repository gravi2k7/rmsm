import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidVolumeError } from "../errors/market.errors";

interface LotSizeProps {
  readonly units: number;
}

/** The number of base-currency (or underlying) units one "lot" of a
 * `Symbol` represents — the conventional forex ladder is Standard
 * (100,000), Mini (10,000), Micro (1,000), Nano (100), but this VO
 * accepts any positive value so it also covers futures/equities' own,
 * symbol-specific contract sizes. */
export class LotSize extends ValueObject<LotSizeProps> {
  private constructor(units: number) {
    super({ units });
  }

  static create(units: number): Result<LotSize, InvalidVolumeError> {
    if (!Number.isFinite(units) || units <= 0) {
      return err(new InvalidVolumeError("lot size must be a positive, finite number."));
    }
    return ok(new LotSize(units));
  }

  static standard(): LotSize {
    return new LotSize(100_000);
  }

  static mini(): LotSize {
    return new LotSize(10_000);
  }

  static micro(): LotSize {
    return new LotSize(1_000);
  }

  get units(): number {
    return this.props.units;
  }

  /** Converts a lot count into raw underlying units — e.g. `2.5` standard
   * lots is `250,000` units. */
  toUnits(lots: number): number {
    return lots * this.props.units;
  }
}
