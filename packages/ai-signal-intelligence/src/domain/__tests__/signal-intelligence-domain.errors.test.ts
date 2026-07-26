import { describe, expect, it } from "vitest";
import { EmptySignalSetError } from "../errors/signal-intelligence-domain.errors";

describe("signal-intelligence domain errors", () => {
  it("EmptySignalSetError carries the EMPTY_SIGNAL_SET code", () => {
    expect(new EmptySignalSetError().code).toBe("EMPTY_SIGNAL_SET");
  });
});
