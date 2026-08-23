import type { ProviderErrorClassification } from "../../interfaces/provider-error-mapper.interface";

export class CTraderFixErrorMapper {
  classify(error: unknown): ProviderErrorClassification {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (
        message.includes("authentication") ||
        message.includes("invalid_data") ||
        message.includes("invalid data") ||
        message.includes("logon rejected") ||
        message.includes("password") ||
        message.includes("credentials")
      ) {
        return "authentication_failed";
      }

      if (
        message.includes("timeout") ||
        message.includes("econnrefused") ||
        message.includes("socket") ||
        message.includes("connection") ||
        message.includes("disconnected") ||
        message.includes("connection closed")
      ) {
        return "provider_outage";
      }

      if (
        message.includes("symbol") &&
        (
          message.includes("not found") ||
          message.includes("unknown")
        )
      ) {
        return "symbol_not_found";
      }

      if (
        message.includes("invalid request") ||
        message.includes("invalid data") ||
        message.includes("reject")
      ) {
        return "invalid_request";
      }
    }

    return "unknown";
  }

  isRetryable(
    classification: ProviderErrorClassification,
  ): boolean {
    return (
      classification === "provider_outage" ||
      classification === "rate_limited"
    );
  }
}
