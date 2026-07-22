import { Prisma } from "@rmsm/database";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";
import { mapPrismaErrorToAppError } from "../prisma-error.mapper";

function knownRequestError(code: string, message: string, meta?: Record<string, unknown>): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: "5.22.0", meta });
}

describe("mapPrismaErrorToAppError (SEC-002)", () => {
  it("maps P2002 (unique constraint) to a 409 ConflictError, surfacing only the field name(s), never the raw Prisma message", () => {
    const raw = knownRequestError("P2002", "Unique constraint failed on the fields: (`email`)\n  at some/internal/path.ts:123", { target: ["email"] });
    const mapped = mapPrismaErrorToAppError(raw);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.message).toBe("A record with this email already exists.");
    expect(mapped.message).not.toContain("internal/path.ts");
    expect(mapped.message).not.toContain("Unique constraint failed");
  });

  it("maps P2025 (record not found) to a 404 NotFoundError", () => {
    const raw = knownRequestError("P2025", "An operation failed because it depends on one or more records that were required but not found.");
    const mapped = mapPrismaErrorToAppError(raw);
    expect(mapped).toBeInstanceOf(NotFoundError);
    expect(mapped.statusCode).toBe(404);
    expect(mapped.message).not.toContain("depends on one or more records");
  });

  it("maps P2003 (foreign key violation) to a 409 ConflictError with a safe generic message", () => {
    const raw = knownRequestError("P2003", 'Foreign key constraint failed on the field: `organizationId`');
    const mapped = mapPrismaErrorToAppError(raw);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.message).not.toContain("organizationId");
  });

  it("maps P2011 (null constraint violation) to a 400 ValidationError, naming only the field", () => {
    const raw = knownRequestError("P2011", "Null constraint violation on the fields: (`slug`)", { target: "slug" });
    const mapped = mapPrismaErrorToAppError(raw);
    expect(mapped).toBeInstanceOf(ValidationError);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.message).toBe("slug is required.");
  });

  it("maps P2014 (required relation violation) to a 409 ConflictError", () => {
    const raw = knownRequestError("P2014", "The change you are trying to make would violate the required relation");
    const mapped = mapPrismaErrorToAppError(raw);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped.statusCode).toBe(409);
  });

  it("maps an unmapped-but-known Prisma error code to a safe generic 500, never the raw message", () => {
    const raw = knownRequestError("P2034", "Transaction failed due to a write conflict or a deadlock. Please retry your transaction");
    const mapped = mapPrismaErrorToAppError(raw);
    expect(mapped.statusCode).toBe(500);
    expect(mapped.code).toBe("DATABASE_ERROR");
    expect(mapped.message).toBe("An unexpected database error occurred");
    expect(mapped.message).not.toContain("deadlock");
  });

  it("maps a PrismaClientValidationError (malformed query — a programming error) to a safe generic 500", () => {
    const ValidationErrorCtor = Prisma.PrismaClientValidationError as unknown as new (message: string, options: { clientVersion: string }) => Prisma.PrismaClientValidationError;
    const raw = new ValidationErrorCtor("Invalid `prisma.user.create()` invocation:\n\n{\n  data: {\n...", { clientVersion: "5.22.0" });
    const mapped = mapPrismaErrorToAppError(raw);
    expect(mapped.statusCode).toBe(500);
    expect(mapped.message).toBe("An unexpected database error occurred");
    expect(mapped.message).not.toContain("invocation");
  });

  it("every mapped error is an AppError (so GlobalExceptionFilter's existing AppError branch handles it uniformly)", () => {
    const raw = knownRequestError("P2002", "x", { target: ["x"] });
    expect(mapPrismaErrorToAppError(raw)).toBeInstanceOf(AppError);
  });
});
