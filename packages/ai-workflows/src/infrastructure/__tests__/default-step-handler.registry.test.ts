import { describe, it, expect } from "vitest";
import { DefaultStepHandlerRegistry } from "../default-step-handler.registry";

describe("DefaultStepHandlerRegistry", () => {
  it("registers and retrieves a handler by name", () => {
    const registry = new DefaultStepHandlerRegistry();
    const handler = async () => "result";
    registry.register("h1", handler);
    expect(registry.get("h1")).toBe(handler);
  });

  it("returns undefined for an unregistered handler", () => {
    const registry = new DefaultStepHandlerRegistry();
    expect(registry.get("missing")).toBeUndefined();
  });
});
