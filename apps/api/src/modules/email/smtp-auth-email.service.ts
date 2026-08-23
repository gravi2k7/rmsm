import { Injectable } from "@nestjs/common";

import type { EmailMessage } from "./email.service.interface";
import { EmailService } from "./email.service.interface";
import { SmtpEmailService } from "./smtp-email.service";

/**
 * Application-level email adapter for authentication and organization
 * workflows.
 *
 * The application email contract uses a single recipient (`to: string`),
 * while the shared SMTP transport uses the provider-agnostic notification
 * contract (`to: string[]`).
 *
 * This adapter owns that boundary conversion so the shared SMTP transport
 * remains strongly typed and reusable by the Notifications module.
 */
@Injectable()
export class SmtpAuthEmailService extends EmailService {
  constructor(private readonly transport: SmtpEmailService) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.send({
      to: [message.to],
      subject: message.subject,
      html: message.html,
    });
  }
}
