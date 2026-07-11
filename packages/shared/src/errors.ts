/** Base application error. All domain errors extend this. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(`${resource}${id ? ` (${id})` : ""} not found`, "NOT_FOUND", 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}
