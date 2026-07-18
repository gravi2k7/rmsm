/**
 * Abstract base for value objects: identified by their attributes, not an
 * id (equality is structural, unlike `Entity`/`AggregateRoot`). Concrete
 * value objects (e.g. a future module's `Money`, `DateRange`, `Percentage`)
 * extend this with their own validated constructor — construction-time
 * validation is exactly where `Guard` (see `validators/guard.ts`) and
 * `InvariantViolationError` (see `errors/domain-error.ts`) are meant to be
 * used, deliberately not provided by this base class itself.
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  /** Structural equality — two value objects are equal if every prop is,
   * regardless of identity. `undefined` is never equal to a missing/other
   * `ValueObject`. */
  public equals(other: ValueObject<TProps> | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return shallowEqual(this.props, other.props);
  }
}

function shallowEqual(a: object, b: object): boolean {
  const aKeys = Object.keys(a) as (keyof typeof a)[];
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], (b as Record<typeof key, unknown>)[key]));
}
