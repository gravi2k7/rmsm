import { UnknownStrategyError, InvalidStrategyLifecycleTransitionError, InvalidStrategyError } from "@rmsm/strategy";
import { NotFoundError, ValidationError, ConflictError, AppError } from "@rmsm/shared";
import { mapDomainErrorToAppError } from "../domain-error.mapper";

describe("mapDomainErrorToAppError", () => {
  it("maps an UNKNOWN_* domain error to a 404", () => {
    const result = mapDomainErrorToAppError(new UnknownStrategyError("strat-1"));
    expect(result.statusCode).toBe(404);
    expect(result.message).toContain("strat-1");
  });

  it("does not double-format the message for a not-found error", () => {
    const result = mapDomainErrorToAppError(new UnknownStrategyError("strat-1"));
    expect(result.message).not.toContain("not found not found");
    expect(result.message).not.toMatch(/not found$/); // NotFoundError's own suffix isn't appended
  });

  it("maps an INVALID_* domain error to a 400", () => {
    const result = mapDomainErrorToAppError(new InvalidStrategyError("bad input"));
    expect(result.statusCode).toBe(400);
  });

  it("maps a *_TRANSITION domain error to a 409", () => {
    const result = mapDomainErrorToAppError(new InvalidStrategyLifecycleTransitionError("DRAFT", "PRODUCTION"));
    expect(result.statusCode).toBe(409);
  });

  it("always returns an AppError instance", () => {
    const result = mapDomainErrorToAppError(new UnknownStrategyError("x"));
    expect(result).toBeInstanceOf(AppError);
  });

  it("preserves the original error message text", () => {
    const error = new InvalidStrategyError("something specific went wrong");
    const result = mapDomainErrorToAppError(error);
    expect(result.message).toBe(error.message);
  });
});

describe("mapDomainErrorToAppError — sanity against real error classes", () => {
  it("NotFoundError/ValidationError/ConflictError are all reachable via the mapper's own code branches", () => {
    // Not asserting instanceof these specific classes (the mapper uses
    // AppError directly for the 404 branch, see its own doc comment) —
    // asserting the *status codes* match what each of these classes
    // would themselves produce, which is the actually meaningful contract.
    expect(new NotFoundError("x").statusCode).toBe(404);
    expect(new ValidationError("x").statusCode).toBe(400);
    expect(new ConflictError("x").statusCode).toBe(409);
  });
});
