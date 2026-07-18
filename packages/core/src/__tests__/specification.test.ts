import { describe, expect, it } from "vitest";
import { CompositeSpecification } from "../contracts";

class IsEven extends CompositeSpecification<number> {
  isSatisfiedBy(candidate: number): boolean {
    return candidate % 2 === 0;
  }
}

class IsPositive extends CompositeSpecification<number> {
  isSatisfiedBy(candidate: number): boolean {
    return candidate > 0;
  }
}

describe("CompositeSpecification", () => {
  it("a single specification evaluates directly", () => {
    expect(new IsEven().isSatisfiedBy(4)).toBe(true);
    expect(new IsEven().isSatisfiedBy(3)).toBe(false);
  });

  it("and() requires both to be satisfied", () => {
    const spec = new IsEven().and(new IsPositive());
    expect(spec.isSatisfiedBy(4)).toBe(true);
    expect(spec.isSatisfiedBy(-4)).toBe(false);
    expect(spec.isSatisfiedBy(3)).toBe(false);
  });

  it("or() requires either to be satisfied", () => {
    const spec = new IsEven().or(new IsPositive());
    expect(spec.isSatisfiedBy(4)).toBe(true); // even, positive
    expect(spec.isSatisfiedBy(-4)).toBe(true); // even, not positive
    expect(spec.isSatisfiedBy(3)).toBe(true); // odd, positive
    expect(spec.isSatisfiedBy(-3)).toBe(false); // odd, not positive
  });

  it("not() inverts the result", () => {
    const spec = new IsEven().not();
    expect(spec.isSatisfiedBy(3)).toBe(true);
    expect(spec.isSatisfiedBy(4)).toBe(false);
  });

  it("composes three-deep", () => {
    const spec = new IsEven().and(new IsPositive()).not();
    expect(spec.isSatisfiedBy(4)).toBe(false); // even+positive -> true -> negated -> false
    expect(spec.isSatisfiedBy(3)).toBe(true); // even+positive -> false -> negated -> true
  });
});
