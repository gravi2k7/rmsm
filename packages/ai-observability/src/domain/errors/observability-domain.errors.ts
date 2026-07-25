import { DomainError } from "@rmsm/core";

/** All AI-204 domain errors extend `@rmsm/core`'s `DomainError` — same
 * decision `@rmsm/ai-memory` made, for the same reason: `@rmsm/core`
 * is the shared kernel every current-generation package in this
 * monorepo depends on. */

export class AIRequestNotFoundError extends DomainError {
  constructor(requestId: string) {
    super(`AI request "${requestId}" was not found.`, "AI_REQUEST_NOT_FOUND");
  }
}

export class DuplicateAIRequestError extends DomainError {
  constructor(requestId: string) {
    super(`AI request "${requestId}" already exists.`, "DUPLICATE_AI_REQUEST");
  }
}

export class InvalidTelemetryDataError extends DomainError {
  constructor(reason: string) {
    super(`Invalid telemetry data: ${reason}`, "INVALID_TELEMETRY_DATA");
  }
}

export class UnknownProviderPricingError extends DomainError {
  constructor(providerName: string, model: string) {
    super(`No pricing is configured for provider "${providerName}" model "${model}".`, "UNKNOWN_PROVIDER_PRICING");
  }
}
