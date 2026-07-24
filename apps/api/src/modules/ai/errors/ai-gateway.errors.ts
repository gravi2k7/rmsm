import { AppError } from "@rmsm/shared";

/**
 * Extends the platform's own foundational `AppError`
 * (`@rmsm/shared`, established since Module 001) rather than
 * building a third, module-specific `code`-based hierarchy the way
 * AI-102/AI-103 did. Deliberate: those modules sit at the trading-
 * domain layer, each with its own REST-facing exception filter
 * translating a `code` field to an HTTP status. AI-201 sits at a
 * lower, platform-infrastructure layer — and the platform's own
 * `GlobalExceptionFilter` (`common/filters/http-exception.filter.ts`,
 * registered globally via `APP_FILTER` in `app.module.ts`) already
 * catches any `AppError` and maps its own `statusCode` directly, with
 * zero new filter needed. Reusing the earliest, most foundational
 * platform convention here is the more conservative choice for new
 * platform infrastructure, not an inconsistency with AI-102/103's own
 * different (and still correct, for their own layer) pattern.
 */
export class ProviderNotFoundError extends AppError {
  constructor(providerType: string) {
    super(`No AI provider registered for type "${providerType}".`, "AI_PROVIDER_NOT_FOUND", 404, { providerType });
  }
}

export class ProviderDisabledError extends AppError {
  constructor(providerType: string) {
    super(`AI provider "${providerType}" is registered but not enabled.`, "AI_PROVIDER_DISABLED", 409, { providerType });
  }
}

export class CapabilityNotSupportedError extends AppError {
  constructor(providerType: string, capability: string) {
    super(`Provider "${providerType}" does not support "${capability}".`, "AI_CAPABILITY_NOT_SUPPORTED", 422, { providerType, capability });
  }
}

export class CircuitOpenError extends AppError {
  constructor(providerType: string) {
    super(`Provider "${providerType}" is temporarily unavailable — too many recent failures (circuit open).`, "AI_CIRCUIT_OPEN", 503, { providerType });
  }
}

export class RateLimitExceededError extends AppError {
  constructor(limitPerMinute: number) {
    super(`AI Gateway rate limit exceeded (${limitPerMinute} requests/minute).`, "AI_RATE_LIMIT_EXCEEDED", 429, { limitPerMinute });
  }
}

export class ProviderRequestFailedError extends AppError {
  constructor(providerType: string, cause: string) {
    super(`Provider "${providerType}" request failed: ${cause}`, "AI_PROVIDER_REQUEST_FAILED", 502, { providerType, cause });
  }
}

export class ModelNotSupportedError extends AppError {
  constructor(providerType: string, model: string) {
    super(`Provider "${providerType}" does not support model "${model}".`, "AI_MODEL_NOT_SUPPORTED", 422, { providerType, model });
  }
}
