import { Injectable } from "@nestjs/common";
import type { ProviderErrorMapper, ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";

/**
 * The one shape every Twelve Data failure is normalized into before
 * anything else in this provider ever sees it — `TwelveDataClient`
 * (twelve-data.client.ts) is the only place that constructs one, whether
 * the failure came from Twelve Data's own in-body error convention
 * (`status: "error"`, HTTP 200), a genuine transport-level HTTP error
 * status, a request that never got a response at all (DNS/connection
 * failure), or this client's own timeout (AbortController). This mapper
 * never has to guess which of those layers produced the failure.
 */
export interface TwelveDataApiError {
  /** Twelve Data's own `code` field when the API responded with a
   * structured error body (400/401/403/404/429/500), else the raw HTTP
   * transport status, else undefined for isNetworkFailure/isTimeout. */
  httpStatus?: number;
  message?: string;
  /** Set when `fetch` itself rejected (DNS failure, connection reset, TLS
   * error) — the request never reached Twelve Data at all. */
  isNetworkFailure?: boolean;
  /** Set when the request was aborted by this client's own timeout
   * (AbortController), distinct from a network failure that arrived with
   * a definite rejection reason. */
  isTimeout?: boolean;
}

function isTwelveDataApiError(error: unknown): error is TwelveDataApiError {
  return typeof error === "object" && error !== null && ("httpStatus" in error || "isNetworkFailure" in error || "isTimeout" in error);
}

/**
 * Twelve Data → RMSM error classification — MD-001's required 401 / 403 /
 * 404 / 429 / 500 / timeout / network-failure / unknown mapping. Reuses
 * the existing `ProviderErrorClassification` vocabulary
 * (provider-error-mapper.interface.ts, Phase 2B) rather than inventing a
 * second, parallel one — "do not change existing interfaces unless
 * absolutely required" applies just as much to quietly duplicating one.
 */
@Injectable()
export class TwelveDataErrorMapper implements ProviderErrorMapper {
  classify(error: unknown): ProviderErrorClassification {
    if (!isTwelveDataApiError(error)) return "unknown";
    if (error.isTimeout) return "provider_outage";
    if (error.isNetworkFailure) return "provider_outage";

    // Twelve Data documents invalid/unrecognized symbols as HTTP 400
    // with a message naming the symbol, not HTTP 404 — this system's own
    // ProviderErrorClassification distinguishes "bad request shape"
    // (invalid_request) from "the requested symbol doesn't exist"
    // (symbol_not_found), so a 400 whose message is clearly about the
    // symbol is classified as the latter, more specific case. A literal
    // 404 (should Twelve Data ever return one) maps the same way.
    if (error.httpStatus === 400 && /symbol/i.test(error.message ?? "")) {
      return "symbol_not_found";
    }

    switch (error.httpStatus) {
      case 404:
        return "symbol_not_found";
      case 401:
      case 403:
        return "authentication_failed";
      case 429:
        return "rate_limited";
      case 400:
        return "invalid_request";
      case 500:
      case 502:
      case 503:
      case 504:
        return "provider_outage";
      default:
        return "unknown";
    }
  }

  /** rate_limited and provider_outage are transient — the exact two
   * classifications ProviderErrorMapper's own doc comment names as
   * "typically retryable." authentication_failed, symbol_not_found, and
   * invalid_request are all request-shape or credential problems a retry
   * cannot fix. */
  isRetryable(classification: ProviderErrorClassification): boolean {
    return classification === "rate_limited" || classification === "provider_outage";
  }
}
