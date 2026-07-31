import { Injectable } from "@nestjs/common";
import type { EmailErrorClassification } from "../contracts/email-platform.contracts";

/**
 * EM-001's own Error Handling section names exactly 7 categories — SMTP
 * Failure, Authentication Failure, Timeout, Invalid Recipient, Provider
 * Unavailable, Rate Limit, Queue Failure — each its own boolean flag
 * here, the same discipline every `*ProviderError` shape in this
 * codebase has used since MD-003/BR-001. Never carries the SMTP
 * password/API key that caused a failure — providers construct this from
 * their own caught errors and never pass credentials into it.
 */
export interface EmailProviderError {
  message?: string;
  httpStatus?: number;
  smtpCode?: number;
  isSmtpFailure?: boolean;
  isAuthenticationFailure?: boolean;
  isTimeout?: boolean;
  isInvalidRecipient?: boolean;
  isProviderUnavailable?: boolean;
  isRateLimit?: boolean;
  isQueueFailure?: boolean;
}

function isEmailProviderError(error: unknown): error is EmailProviderError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("smtpCode" in error ||
      "httpStatus" in error ||
      "isSmtpFailure" in error ||
      "isAuthenticationFailure" in error ||
      "isTimeout" in error ||
      "isInvalidRecipient" in error ||
      "isProviderUnavailable" in error ||
      "isRateLimit" in error ||
      "isQueueFailure" in error)
  );
}

@Injectable()
export class EmailErrorMapper {
  classify(error: unknown): EmailErrorClassification {
    if (!isEmailProviderError(error)) return "unknown";

    if (error.isAuthenticationFailure) return "authentication_failure";
    if (error.isInvalidRecipient) return "invalid_recipient";
    if (error.isRateLimit) return "rate_limit";
    if (error.isQueueFailure) return "queue_failure";
    if (error.isProviderUnavailable) return "provider_unavailable";
    if (error.isTimeout) return "timeout";
    if (error.isSmtpFailure) return "smtp_failure";

    switch (error.httpStatus) {
      case 401:
      case 403:
        return "authentication_failure";
      case 422:
        return "invalid_recipient";
      case 429:
        return "rate_limit";
      case 408:
        return "timeout";
      case 502:
      case 503:
      case 504:
        return "provider_unavailable";
      default:
        return "unknown";
    }
  }

  isRetryable(classification: EmailErrorClassification): boolean {
    return classification === "timeout" || classification === "provider_unavailable" || classification === "rate_limit" || classification === "smtp_failure";
  }
}
