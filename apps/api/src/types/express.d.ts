// Ambient declaration file (not a module — no import/export statements),
// picked up automatically by tsc's default project-wide inclusion (this
// project's tsconfig has no `include` array, so tsc includes every .ts
// file under the project root recursively). This is the standard,
// working pattern for extending Express's Request type in a way that's
// visible everywhere — a `declare module "express"` block placed
// inside a *module* file (one with its own import/export statements,
// like request-id.middleware.ts originally had it) only merges into
// that file's own local view of the type, not the whole compilation;
// caught by a real `tsc` failure in two files that never import the
// middleware directly, not assumed correct on the first attempt.
declare namespace Express {
  export interface Request {
    /** Correlation id for this request — set by RequestIdMiddleware (apps/api/src/common/middleware/request-id.middleware.ts). Echoed from an inbound X-Request-Id header if present, or generated fresh otherwise. Never trusted for anything security-sensitive; purely a log-correlation aid. */
    requestId: string;
  }
}
