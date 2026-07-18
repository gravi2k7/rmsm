import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidVolumeError } from "../errors/market.errors";

interface VolumeProps {
  readonly units: number;
}

/** A non-negative traded/tradable quantity — used both for a `Tick`'s own
 * traded size and for a `Symbol`'s min/max volume bounds. Zero is valid
 * (e.g. a quote-only tick with no trade attached reports zero volume);
 * negative is not. */
export class Volume extends ValueObject<VolumeProps> {
  private constructor(units: number) {
    super({ units });
  }

  static create(units: number): Result<Volume, InvalidVolumeError> {
    if (!Number.isFinite(units)) {
      return err(new InvalidVolumeError("units must be a finite number."));
    }
    if (units < 0) {
      return err(new InvalidVolumeError("units must not be negative."));
    }
    return ok(new Volume(units));
  }

  static zero(): Volume {
    return new Volume(0);
  }

  get units(): number {
    return this.props.units;
  }

  isZero(): boolean {
    return this.props.units === 0;
  }

  add(other: Volume): Volume {
    return new Volume(this.props.units + other.props.units);
  }

  isWithin(min: Volume, max: Volume): boolean {
    return this.props.units >= min.units && this.props.units <= max.units;
  }

  toString(): string {
    return String(this.props.units);
  }
}
