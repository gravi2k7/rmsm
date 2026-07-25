import { Prisma } from "@rmsm/database";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@rmsm/shared";

/**
 * Maps Prisma errors into the application's AppError hierarchy.
 * Any unmapped Prisma error is converted into a generic 500 response
 * so raw database messages are never exposed to API clients.
 */
export function mapPrismaErrorToAppError(
  error:
    | Prisma.PrismaClientKnownRequestError
    | Prisma.PrismaClientValidationError
    | Prisma.PrismaClientInitializationError
    | Prisma.PrismaClientRustPanicError,
): AppError {
  // Validation, initialization and panic errors should never expose
  // Prisma's original message to clients.
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return new AppError(
      "An unexpected database error occurred",
      "DATABASE_ERROR",
      500,
    );
  }

  const target =
    Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ")
      : typeof error.meta?.target === "string"
        ? error.meta.target
        : undefined;

  switch (error.code) {
    case "P2002":
      return new ConflictError(
        target
          ? `A record with this ${target} already exists.`
          : "A record with these values already exists.",
        target ? { fields: target } : undefined,
      );

    case "P2025":
      return new NotFoundError("Record");

    case "P2003":
      return new ConflictError(
        "This operation references a record that does not exist or cannot be modified while still referenced elsewhere.",
      );

    case "P2011":
      return new ValidationError(
        target ? `${target} is required.` : "A required field was missing.",
      );

    case "P2014":
      return new ConflictError(
        "This operation would violate a required relationship between records.",
      );

    default:
      return new AppError(
        "An unexpected database error occurred",
        "DATABASE_ERROR",
        500,
      );
  }
}