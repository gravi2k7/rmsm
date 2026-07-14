import type { EmailProviderType } from "@rmsm/database";

/**
 * Email provider abstraction — mirrors Module 004's PaymentProviderAdapter
 * pattern exactly (same registry-based extensibility, same "no SDK
 * coupling" philosophy demonstrated there for Stripe/Razorpay/PayPal).
 * Phase 2 will implement SmtpEmailProvider, SesEmailProvider,
 * SendGridEmailProvider, MailgunEmailProvider, ResendEmailProvider against
 * this interface; nothing above the provider layer depends on any
 * provider's SDK.
 */

export interface EmailAttachment {
  fileName: string;
  mimeType: string;
  content: Buffer | string; // string = base64
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  /// Used for correlating this send with a NotificationDelivery row and
  /// for open/click tracking pixel/link generation (Phase 2).
  metadata?: Record<string, string>;
}

export interface EmailSendResult {
  providerMessageId: string;
}

export interface EmailBounceEvent {
  providerMessageId: string;
  recipient: string;
  reason: string;
  isPermanent: boolean;
}

export abstract class EmailProviderAdapter {
  abstract readonly type: EmailProviderType;
  abstract readonly enabled: boolean;

  abstract send(message: EmailMessage): Promise<EmailSendResult>;

  /** Verifies an inbound webhook payload's signature using the provider's own scheme (SendGrid/Mailgun/SES each differ) — same async-by-default shape as Module 004's PaymentProviderAdapter, since not every provider's scheme is a local HMAC check. */
  abstract verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean>;

  /** Parses an already-verified inbound webhook payload (bounce/open/click/delivered) into the provider-agnostic event shape TrackingService consumes. */
  abstract parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";
    occurredAt: Date;
    raw: Record<string, unknown>;
  };
}
