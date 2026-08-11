import type { EmailProviderType } from "@rmsm/database";

import {
  EmailProviderAdapter,
  EmailMessage,
  EmailSendResult,
} from "../../interfaces/providers/email-provider.interface";

import {
  SmtpEmailCredentials,
  SmtpEmailService,
} from "../../../email/smtp-email.service";

export type SmtpCredentials = SmtpEmailCredentials;

/**
 * Notifications adapter for the shared SMTP transport.
 *
 * ProviderFactory remains responsible for decrypting the credentials.
 * This adapter preserves the existing EmailProviderAdapter contract while
 * delegating all SMTP protocol work to the shared email transport.
 */
export class SmtpEmailProvider extends EmailProviderAdapter {
  readonly type: EmailProviderType = "SMTP";

  private readonly transport: SmtpEmailService;

  constructor(private readonly credentials: SmtpCredentials) {
    super();
    this.transport = new SmtpEmailService(credentials);
  }

  get enabled(): boolean {
    return this.transport.enabled;
  }

  send(message: EmailMessage): Promise<EmailSendResult> {
    return this.transport.send(message);
  }

  async verifyWebhookSignature(): Promise<boolean> {
    return false;
  }

  parseWebhookEvent(): never {
    throw new Error(
      "SmtpEmailProvider does not support inbound webhooks — see class comment.",
    );
  }
}
