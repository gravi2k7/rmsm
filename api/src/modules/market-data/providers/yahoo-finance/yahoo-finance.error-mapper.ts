import { Injectable } from "@nestjs/common";
import type { ProviderErrorMapper, ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";

/**
 * The one shape every Yahoo Finance failure is normalized into.
 * MD-004's own Error Handling section names exactly six categories —
 * Network Error, Timeout, Invalid Symbol, Parsing Error, Provider
 * Unavailable, Unexpected Response — each represented here as its own
 * boolean flag, same discipline as `AlphaVantageApiError` (MD-003).
 * `YahooFinanceClient` (yahoo-finance.client.ts) is the only place that
 * constructs one of these.
 */
export interface YahooFinanceApiError {
  httpStatus?: number;
  message?: string;
  /** MD-004's "Network Error". */
  isNetworkError?: boolean;
  /** MD-004's "Timeout". */
  isTimeout?: boolean;
  /** MD-004's "Invalid Symbol" — Yahoo's chart endpoint returns `chart.error` for an unrecognized symbol; quoteSummary returns an empty/absent `result`. Both are detected by the client and normalized to this flag. */
  isInvalidSymbol?: boolean;
  /** MD-004's "Parsing Error" — the body wasn't valid JSON, or `res.json()` itself threw. */
  isParsingError?: boolean;
  /** MD-004's "Provider Unavailable" — also covers this provider's own crumb/cookie session failing (Yahoo's unofficial quoteSummary auth is the single most fragile part of this integration; see the client's doc comment), since a failed crumb makes the provider just as unavailable as a 5xx would. */
  isProviderUnavailable?: boolean;
  /** MD-004's "Unexpected Response" — the body parsed as JSON and had no error signal, but didn't match any expected shape (e.g. `chart.result` present but empty, or a completely different module set than requested). */
  isUnexpectedResponse?: boolean;
}

function isYahooFinanceApiError(error: unknown): error is YahooFinanceApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("httpStatus" in error ||
      "isNetworkError" in error ||
      "isTimeout" in error ||
      "isInvalidSymbol" in error ||
      "isParsingError" in error ||
      "isProviderUnavailable" in error ||
      "isUnexpectedResponse" in error)
  );
}

/**
 * Yahoo Finance → RMSM error classification, reusing the existing
 * `ProviderErrorClassification` vocabulary — same reuse discipline as
 * every provider since MD-001. A defensive HTTP-status fallback covers
 * whatever `YahooFinanceClient` didn't already classify from the body.
 */
@Injectable()
export class YahooFinanceErrorMapper implements ProviderErrorMapper {
  classify(error: unknown): ProviderErrorClassification {
    if (!isYahooFinanceApiError(error)) return "unknown";

    if (error.isInvalidSymbol) return "symbol_not_found";
    if (error.isTimeout) return "provider_outage";
    if (error.isNetworkError) return "provider_outage";
    if (error.isProviderUnavailable) return "provider_outage";
    if (error.isParsingError) return "unknown";
    if (error.isUnexpectedResponse) return "unknown";

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

  isRetryable(classification: ProviderErrorClassification): boolean {
    return classification === "rate_limited" || classification === "provider_outage";
  }
}
