import { DomainError } from "@rmsm/core";
import { Prisma } from "@prisma/client";

/**
 * Domain-shaped database errors, extending `@rmsm/core`'s `DomainError` —
 * the same base every module's own domain error hierarchy extends (per
 * the platform's established convention: one abstract base with a
 * `code: string`, mapped to HTTP status by each owning module's own
 * exception filter, never a long `instanceof` chain reaching into Prisma
 * error internals from application code).
 *
 * `translatePrismaError()` is the single place that decides how a raw
 * `Prisma.PrismaClientKnownRequestError` becomes one of these — repository
 * code should never inspect `error.code === "P2002"` itself.
 */

export class RecordNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} (${id}) was not found.`, "RECORD_NOT_FOUND");
  }
}

export class UniqueConstraintViolationError extends DomainError {
  constructor(
    entityName: string,
    public readonly fields: readonly string[],
  ) {
    super(`${entityName} already exists with the same ${fields.join(", ")}.`, "UNIQUE_CONSTRAINT_VIOLATION");
  }
}

export class ForeignKeyConstraintError extends DomainError {
  constructor(entityName: string) {
    super(`Operation on ${entityName} violates a foreign-key constraint (a referenced record doesn't exist or is still referenced).`, "FOREIGN_KEY_CONSTRAINT");
  }
}

/** Raised by optimistic-locking hooks (see `interfaces/repository.interface.ts`'s
 * `VersionedEntity`) when an update's expected `version` doesn't match the
 * currently persisted row — the row was modified since it was read. */
export class OptimisticLockError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} (${id}) was modified by another operation. Reload and retry.`, "OPTIMISTIC_LOCK_CONFLICT");
  }
}

/** Catch-all for a Prisma error this translator doesn't have a specific
 * mapping for — still a `DomainError`, so calling code has one consistent
 * type to handle, but preserves the original Prisma error code for
 * debugging rather than pretending to know what happened. */
export class UnknownDatabaseError extends DomainError {
  constructor(
    message: string,
    public readonly prismaCode?: string,
  ) {
    super(message, "UNKNOWN_DATABASE_ERROR");
  }
}

/**
 * Translates a raw Prisma error into the appropriate `DomainError`
 * subclass above. `entityName` is supplied by the caller (a repository
 * always knows which entity it was operating on; Prisma's own error
 * doesn't reliably expose a human-readable one).
 */
export function translatePrismaError(error: unknown, entityName: string): DomainError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025": // "Record to update/delete does not exist"
        return new RecordNotFoundError(entityName, extractIdMeta(error) ?? "unknown");
      case "P2002": // unique constraint violation
        return new UniqueConstraintViolationError(entityName, extractTargetFields(error));
      case "P2003": // foreign key constraint violation
        return new ForeignKeyConstraintError(entityName);
      default:
        return new UnknownDatabaseError(`Database operation on ${entityName} failed (${error.code}): ${error.message}`, error.code);
    }
  }

  if (error instanceof DomainError) return error;

  return new UnknownDatabaseError(error instanceof Error ? error.message : String(error));
}

function extractTargetFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return ["unknown field"];
}

function extractIdMeta(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const cause = error.meta?.cause;
  return typeof cause === "string" ? cause : undefined;
}
