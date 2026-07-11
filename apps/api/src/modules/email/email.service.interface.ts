export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Provider abstraction — AuthService and future modules depend on this
 * token, never on a concrete transport. Swapping console → SMTP → a
 * transactional provider (Postmark, SES, Resend) means implementing this
 * interface and changing one binding in EmailModule, nothing else.
 */
export abstract class EmailService {
  abstract send(message: EmailMessage): Promise<void>;
}
