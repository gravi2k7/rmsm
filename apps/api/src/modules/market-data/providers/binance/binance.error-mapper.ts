import { Injectable } from "@nestjs/common";
import type {
  ProviderErrorClassification,
  ProviderErrorMapper,
} from "../../interfaces/provider-error-mapper.interface";

export interface BinanceApiError {
  httpStatus?: number;
  code?: number;
  message: string;
  isTimeout?: boolean;
  isNetworkFailure?: boolean;
}

@Injectable()
export class BinanceErrorMapper implements ProviderErrorMapper {
  classify(error: unknown): ProviderErrorClassification {
    const err = error as BinanceApiError;

    if (err?.httpStatus === 429 || err?.httpStatus === 418) {
      return "rate_limited";
    }

    if (
      err?.isTimeout ||
      err?.isNetworkFailure ||
      (typeof err?.httpStatus === "number" && err.httpStatus >= 500)
    ) {
      return "provider_outage";
    }

    return "unknown";
  }

  isRetryable(classification: ProviderErrorClassification): boolean {
    return classification === "rate_limited" || classification === "provider_outage";
  }
}
