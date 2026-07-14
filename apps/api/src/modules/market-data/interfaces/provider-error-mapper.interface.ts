/**
 * Maps a provider's own error shape (HTTP status, error body, thrown
 * exception — whatever that specific provider's SDK-free REST client
 * produces) into this module's own classification, so callers never need
 * to know which provider they're talking to in order to decide how to
 * react to a failure.
 */
export type ProviderErrorClassification =
  | "rate_limited"
  | "authentication_failed"
  | "symbol_not_found"
  | "provider_outage"
  | "invalid_request"
  | "unknown";

export interface ProviderErrorMapper {
  classify(error: unknown): ProviderErrorClassification;
  /** Whether a caller should retry after classify() — rate_limited and provider_outage are typically retryable; authentication_failed and invalid_request typically are not. Left to the implementation to decide per classification, not hardcoded here. */
  isRetryable(classification: ProviderErrorClassification): boolean;
}
