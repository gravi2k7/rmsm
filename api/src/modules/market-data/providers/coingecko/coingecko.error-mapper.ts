import { Injectable } from "@nestjs/common";
import type { ProviderErrorMapper, ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";

/**
 * The one shape every CoinGecko failure is normalized into before
 * anything else in this provider sees it — mirrors
 * `TwelveDataApiError` (twelve-data.error-mapper.ts) exactly, so both
 * providers' error-handling shape is consistent even though the two
 * upstream APIs report errors differently. `CoinGeckoClient`
 * (coingecko.client.ts) is the only place that constructs one.
 */
export interface CoinGeckoApiError {
  httpStatus?: number;
  message?: string;
  /** True when the request was for a coin id CoinGecko has no market
   * data for — distinct from a generic 404, since CoinGecko's
   * `/coins/markets` doesn't 404 for an unknown id, it just omits it
   * from the response array (see coingecko.client.ts). */
  isUnknownSymbol?: boolean;
  isNetworkFailure?: boolean;
  isTimeout?: boolean;
}

function isCoinGeckoApiError(error: unknown): error is CoinGeckoApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("httpStatus" in error || "isNetworkFailure" in error || "isTimeout" in error || "isUnknownSymbol" in error)
  );
}

/**
 * CoinGecko → RMSM error classification — MD-002's required 429 / 404 /
 * "invalid symbol" / network-timeout / HTTP-errors mapping. Reuses the
 * existing `ProviderErrorClassification` vocabulary (Phase 2B,
 * `provider-error-mapper.interface.ts`) rather than inventing a second
 * one, exactly like `TwelveDataErrorMapper`.
 */
@Injectable()
export class CoinGeckoErrorMapper implements ProviderErrorMapper {
  classify(error: unknown): ProviderErrorClassification {
    if (!isCoinGeckoApiError(error)) return "unknown";
    if (error.isUnknownSymbol) return "symbol_not_found";
    if (error.isTimeout) return "provider_outage";
    if (error.isNetworkFailure) return "provider_outage";

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

  /** Same rule as TwelveDataErrorMapper: only genuinely transient
   * classifications are retryable. */
  isRetryable(classification: ProviderErrorClassification): boolean {
    return classification === "rate_limited" || classification === "provider_outage";
  }
}
