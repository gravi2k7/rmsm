import { DomainError } from "@rmsm/core";
import { AppError, ConflictError, ValidationError } from "@rmsm/shared";

/**
 * The one place a domain error's own `code` (from any of the 6 business
 * domain packages — Market, Strategy, Opportunity, Decision, Execution,
 * Portfolio) becomes an HTTP status — matching `@rmsm/core`'s own
 * `DomainError` doc comment, which names exactly this pattern ("each
 * owning module maps its own domain error hierarchy to HTTP status via a
 * dedicated exception filter keyed on `code`"). Every domain package's
 * own error `code` values are unique strings this application layer has
 * no compile-time dependency on — matched here by substring convention
 * (`"UNKNOWN_"`, `"INVALID_"`, etc.) rather than a giant per-code lookup
 * table, since every one of the ~40 domain error classes across all 6
 * packages already names its own semantic category in its own code.
 *
 * Never modifies the domain packages themselves (forbidden this phase) —
 * this is purely an application-layer adapter reading a value the domain
 * layer already exposes.
 */
export function mapDomainErrorToAppError(error: DomainError): AppError {
  const code = error.code;

  if (code.startsWith("UNKNOWN_") || code === "ENTITY_NOT_FOUND") {
    // Not `new NotFoundError(error.message)` — that class's own
    // constructor takes a bare resource name and builds "<resource> (<id>)
    // not found" itself; the domain error's own `message` is already a
    // complete, well-formed sentence ("Strategy "abc" is not known."),
    // and running it through NotFoundError's formatting would double up
    // ("...is not known. not found"). AppError direct, with the same
    // code/status NotFoundError itself uses.
    return new AppError(error.message, "NOT_FOUND", 404);
  }

  // Checked before the general "INVALID_" prefix branch below —
  // every lifecycle/state-transition error across all 6 domain packages
  // is itself named "INVALID_*_TRANSITION" (e.g. Strategy's
  // "INVALID_LIFECYCLE_TRANSITION", Decision's
  // "INVALID_DECISION_TRANSITION"), so it would otherwise always match
  // the broader "INVALID_" check first and this branch would be
  // unreachable — a real ordering bug caught by this mapper's own test
  // suite, not left in.
  if (
    code.includes("TRANSITION") ||
    code === "CONCURRENCY_CONFLICT" ||
    code === "DRAWDOWN_LIMIT_EXCEEDED" ||
    code === "MARKET_CLOSED"
  ) {
    return new ConflictError(error.message);
  }

  if (
    code.startsWith("INVALID_") ||
    code.includes("VALIDATION") ||
    code === "INVARIANT_VIOLATION" ||
    code === "ORDER_ROUTING_FAILED"
  ) {
    return new ValidationError(error.message);
  }

  // Anything not matched above is still a client-supplied-but-rejected
  // case (a real domain rule declined the request), not a server fault —
  // 400, not the AppError default of 500, is the honest default here.
  return new AppError(error.message, code, 400);
}
