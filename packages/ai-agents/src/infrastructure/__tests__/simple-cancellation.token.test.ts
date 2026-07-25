import { describe, it, expect } from "vitest";
import { SimpleCancellationToken } from "../simple-cancellation.token";

describe("SimpleCancellationToken", () => {
  it("starts uncancelled and reflects cancel()", () => {
    const token = new SimpleCancellationToken();
    expect(token.isCancelled()).toBe(false);
    token.cancel();
    expect(token.isCancelled()).toBe(true);
  });
});
