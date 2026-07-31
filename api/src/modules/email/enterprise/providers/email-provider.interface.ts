import type { EmailProviderId } from "../contracts/email-platform.contracts";
import type { EnterpriseEmailMessage, EmailSendResult } from "../types/email-platform.types";

/**
 * EM-001's own "Provider Interface" — every current (Console/SMTP/Resend)
 * and future (SendGrid/SES/Mailgun/Microsoft Graph/Gmail — not
 * implemented this milestone, see each provider file's own doc comment)
 * provider implements this and nothing above `EmailProviderRegistry`
 * ever imports a concrete provider class or its SDK. Mirrors BR-001's
 * `BrokerProvider`/MD-001's `MarketDataProvider` shape (a `type` +
 * `enabled` pair plus the domain operation), applied here to email.
 */
export interface EmailProvider {
  readonly type: EmailProviderId;
  readonly enabled: boolean;

  send(message: EnterpriseEmailMessage): Promise<EmailSendResult>;

  /** Used by `EmailHealthProvider`'s "SMTP Connection"/"Provider Status" checks — verifies the provider can actually reach its transport (an SMTP handshake, a lightweight authenticated API call) without sending a real message. Never throws; returns false on any failure. */
  verifyConnection(): Promise<boolean>;
}
