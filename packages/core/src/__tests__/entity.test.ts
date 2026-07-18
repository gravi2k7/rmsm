import { describe, expect, it } from "vitest";
import { Entity } from "../entities";

class Widget extends Entity<string> {
  constructor(
    id: string,
    public readonly label: string,
  ) {
    super(id);
  }
}

class Gadget extends Entity<string> {
  constructor(id: string) {
    super(id);
  }
}

describe("Entity", () => {
  it("two instances with the same id are equal, even with different other fields", () => {
    const a = new Widget("id-1", "Original label");
    const b = new Widget("id-1", "Different label");
    expect(a.equals(b)).toBe(true);
  });

  it("two instances with different ids are not equal", () => {
    const a = new Widget("id-1", "x");
    const b = new Widget("id-2", "x");
    expect(a.equals(b)).toBe(false);
  });

  it("instances of different concrete classes are never equal, even with the same id", () => {
    const widget = new Widget("id-1", "x");
    const gadget = new Gadget("id-1");
    expect(widget.equals(gadget)).toBe(false);
  });

  it("is equal to itself", () => {
    const a = new Widget("id-1", "x");
    expect(a.equals(a)).toBe(true);
  });

  it("is not equal to null or undefined", () => {
    const a = new Widget("id-1", "x");
    expect(a.equals(null)).toBe(false);
    expect(a.equals(undefined)).toBe(false);
  });
});
