import { describe, expect, it } from "vitest";
import { ValueObject } from "../value-objects";

interface PointProps {
  x: number;
  y: number;
}

class Point extends ValueObject<PointProps> {
  constructor(x: number, y: number) {
    super({ x, y });
  }

  get x(): number {
    return this.props.x;
  }

  get y(): number {
    return this.props.y;
  }
}

class Vector extends ValueObject<PointProps> {
  constructor(x: number, y: number) {
    super({ x, y });
  }
}

describe("ValueObject", () => {
  it("two instances with identical props are equal", () => {
    const a = new Point(1, 2);
    const b = new Point(1, 2);
    expect(a.equals(b)).toBe(true);
  });

  it("two instances with different props are not equal", () => {
    const a = new Point(1, 2);
    const b = new Point(1, 3);
    expect(a.equals(b)).toBe(false);
  });

  it("instances of different concrete classes are never equal, even with identical props", () => {
    const point = new Point(1, 2);
    const vector = new Vector(1, 2);
    expect(point.equals(vector)).toBe(false);
  });

  it("is not equal to null or undefined", () => {
    const a = new Point(1, 2);
    expect(a.equals(null)).toBe(false);
    expect(a.equals(undefined)).toBe(false);
  });

  it("props are frozen (immutable)", () => {
    const a = new Point(1, 2);
    expect(() => {
      // @ts-expect-error -- intentional: verifying runtime immutability, not type-level
      a.props.x = 99;
    }).toThrow();
  });
});
