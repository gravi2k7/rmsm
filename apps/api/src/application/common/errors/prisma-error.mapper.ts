import { Prisma } from "@rmsm/database";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";

/**
 * Maps Prisma's own error types to this application's `AppError`
 * hierarchy — the database-layer counterpart to `domain-error.mapper.ts`
 * (which handles the 6 business domains' own `DomainError` subclasses).
 * Added for SEC-002 (BVP-003 → BVP-003R): before this mapper existed, no
 * code anywhere in `apps/api` caught Prisma's error types explicitly, so
 * any of them reaching `GlobalExceptionFilter` uncaught fell through to
 * its generic `Error` branch, which forwards `error.message` directly to
 * the client — and Prisma's own messages can include raw column/
 * constraint/table names.
 *
 * Every branch below returns a message built from *known, static text
 * plus the field names Prisma reports* (schema field names the caller
 * already knows from the DTO they submitted — not sensitive
 * infrastructure detail), never the raw Prisma-generated message string
 * itself. Error codes are Prisma's own, documented, stable identifiers
 * (see https://www.prisma.io/docs/orm/reference/error-reference) — only
 * the ones realistically reachable from this application's actual query
 * patterns are mapped explicitly; anything else falls through to a safe,
 * fully generic 500 rather than being silently missed.
 */
export function mapPrismaErrorToAppError(
  error: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError | Prisma.PrismaClientInitializationError | Prisma.PrismaClientRustPanicError,
): AppError {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    // Validation/initialization/panic errors are programming or
    // infrastructure failures, never something a client request could
    // have caused correctly — always a generic 500, never the raw
    // message (which, for a validation error especially, can include
    // the full attempted query).
    return new AppError("An unexpected database error occurred", "DATABASE_ERROR", 500);
  }

  const target = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(", ") : typeof error.meta?.target === "string" ? error.meta.target : undefined;

  switch (error.code) {
    case "P2002": // Unique constraint violation
      return new ConflictError(target ? `A record with this ${target} already exists.` : "A record with these values already exists.", target ? { fields: target } : undefined);

    case "P2025": // Record required for the operation was not found
      return new NotFoundError("Record");

    case "P2003": // Foreign key constraint violation
      return new ConflictError("This operation references a record that does not exist or cannot be modified while still referenced elsewhere.");

    case "P2011": // Null constraint violation
      return new ValidationError(target ? `${target} is required.` : "A required field was missing.");

    case "P2014": // Required relation would be violated
      return new ConflictError("This operation would violate a required relationship between records.");

    default:
      // Every other known Prisma error code: still a real, identifiable
      // database-layer failure, but not one this application has a
      // specific, safe client-facing message for yet — generic 500,
      // never the raw message. The original error (with its real code
      // and message) is still available to whatever caught this for
      // server-side logging (see GlobalExceptionFilter, which logs the
      // original `exception`, not this mapped result).
      return new AppError("An unexpected database error occurred", "DATABASE_ERROR", 500);
  }
}
