import { Injectable } from "@nestjs/common";
import type { ProviderErrorMapper, ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";

/**
 * The one shape every Alpha Vantage failure is normalized into before
 * anything else in this provider sees it. Alpha Vantage's defining
 * characteristic — confirmed against its own documentation and observed
 * behavior — is that its `/query` endpoint returns HTTP 200 for nearly
 * everything, including what would be a 4xx/429 on almost any other
 * REST API; the real error signal lives INSIDE the JSON body, as one of
 * three different keys (`"Error Message"`, `"Note"`, `"Information"`),
 * each used for a different failure category. `AlphaVantageClient`
 * (alphavantage.client.ts) is the only place that inspects a raw
 * response body and constructs one of these; a genuine non-200 HTTP
 * status is handled too (`httpStatus`), as a defensive fallback for
 * network-layer failures Alpha Vantage's own gateway might one day
 * introduce, not the primary path.
 */
export interface AlphaVantageApiError {
  httpStatus?: number;
  message?: string;
  /** Alpha Vantage returned `{"Note": "..."}` — its original, longest-standing rate-limit signal. */
  isNoteRateLimit?: boolean;
  /** Alpha Vantage returned `{"Information": "..."}` — used for both newer rate-limit messaging and premium-endpoint/invalid-key messaging; `classify()` inspects `message` to tell them apart. */
  isInformationMessage?: boolean;
  /** Alpha Vantage returned `{"Error Message": "..."}` — malformed request (unknown function, missing required param, etc.). */
  isErrorMessage?: boolean;
  /** MD-003's explicit "404 Symbol Not Found" case — Alpha Vantage does not 404; `GLOBAL_QUOTE` for an unrecognized symbol returns `{"Global Quote": {}}`, an empty object with HTTP 200. Detected by the client, not inferred here from a status code that will never arrive. */
  isEmptyResult?: boolean;
  /** MD-003's explicit "Malformed Response" case — the body parsed as JSON but matched none of the expected shapes (or `res.json()` itself threw). */
  isMalformedResponse?: boolean;
  isNetworkFailure?: boolean;
  isTimeout?: boolean;
}

function isAlphaVantageApiError(error: unknown): error is AlphaVantageApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("httpStatus" in error ||
      "isNoteRateLimit" in error ||
      "isInformationMessage" in error ||
      "isErrorMessage" in error ||
      "isEmptyResult" in error ||
      "isMalformedResponse" in error ||
      "isNetworkFailure" in error ||
      "isTimeout" in error)
  );
}

/**
 * Alpha Vantage → RMSM error classification — MD-003's required 429 /
 * 403 / 404 / invalid-function / timeout / malformed-response / HTTP
 * mapping. Reuses the existing `ProviderErrorClassification` vocabulary,
 * same as every other provider in this module since MD-001.
 */
@Injectable()
export class AlphaVantageErrorMapper implements ProviderErrorMapper {
  classify(error: unknown): ProviderErrorClassification {
    if (!isAlphaVantageApiError(error)) return "unknown";

    if (error.isEmptyResult) return "symbol_not_found";
    if (error.isNoteRateLimit) return "rate_limited";
    if (error.isTimeout) return "provider_outage";
    if (error.isNetworkFailure) return "provider_outage";

    if (error.isInformationMessage) {
      const message = (error.message ?? "").toLowerCase();
      if (message.includes("apikey") || message.includes("api key") || message.includes("premium")) return "authentication_failed";
      return "rate_limited";
    }

    if (error.isErrorMessage) {
      const message = (error.message ?? "").toLowerCase();
      if (message.includes("apikey") || message.includes("api key")) return "authentication_failed";
      return "invalid_request";
    }

    if (error.isMalformedResponse) return "unknown";

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
