import { Injectable } from "@nestjs/common";
import type { BrokerErrorMapper } from "../../interfaces/broker-error-mapper.interface";
import type { BrokerErrorClassification } from "../../contracts/broker.contracts";

/**
 * The one shape every MetaTrader5 failure is normalized into.
 * BR-001's own Error Handling section names exactly nine categories —
 * Connection Failed, Login Failed, Invalid Credentials, Timeout, Order
 * Rejected, Symbol Not Found, Broker Offline, Session Expired, Network
 * Error — each its own boolean flag here, the same discipline every
 * `*ApiError` shape in this codebase has used since MD-003. Never
 * carries the raw `password` that caused a login failure — only
 * `MetaTrader5Client`/`MetaTrader5SessionManager` ever see credentials,
 * and neither one includes them when constructing one of these.
 */
export interface Mt5BrokerError {
  httpStatus?: number;
  message?: string;
  isConnectionFailed?: boolean;
  isLoginFailed?: boolean;
  isInvalidCredentials?: boolean;
  isTimeout?: boolean;
  isOrderRejected?: boolean;
  isSymbolNotFound?: boolean;
  isBrokerOffline?: boolean;
  isSessionExpired?: boolean;
  isNetworkError?: boolean;
}

function isMt5BrokerError(error: unknown): error is Mt5BrokerError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("httpStatus" in error ||
      "isConnectionFailed" in error ||
      "isLoginFailed" in error ||
      "isInvalidCredentials" in error ||
      "isTimeout" in error ||
      "isOrderRejected" in error ||
      "isSymbolNotFound" in error ||
      "isBrokerOffline" in error ||
      "isSessionExpired" in error ||
      "isNetworkError" in error)
  );
}

/**
 * MetaTrader 5 → this domain's `BrokerErrorClassification` vocabulary.
 * A defensive HTTP-status fallback covers whatever the gateway client
 * didn't already classify from the response body.
 */
@Injectable()
export class MetaTrader5ErrorMapper implements BrokerErrorMapper {
  classify(error: unknown): BrokerErrorClassification {
    if (!isMt5BrokerError(error)) return "unknown";

    if (error.isInvalidCredentials) return "invalid_credentials";
    if (error.isLoginFailed) return "login_failed";
    if (error.isSessionExpired) return "session_expired";
    if (error.isSymbolNotFound) return "symbol_not_found";
    if (error.isOrderRejected) return "order_rejected";
    if (error.isBrokerOffline) return "broker_offline";
    if (error.isConnectionFailed) return "connection_failed";
    if (error.isTimeout) return "timeout";
    if (error.isNetworkError) return "network_error";

    switch (error.httpStatus) {
      case 401:
      case 403:
        return "invalid_credentials";
      case 404:
        return "symbol_not_found";
      case 408:
        return "timeout";
      case 502:
      case 503:
      case 504:
        return "broker_offline";
      default:
        return "unknown";
    }
  }

  isRetryable(classification: BrokerErrorClassification): boolean {
    return classification === "timeout" || classification === "network_error" || classification === "broker_offline" || classification === "connection_failed";
  }
}
