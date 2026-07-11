import { Injectable, Logger } from "@nestjs/common";
import { EmailMessage, EmailService } from "./email.service.interface";

/**
 * Dev/local implementation — logs instead of sending. This is the default
 * (EMAIL_PROVIDER=console). Swap to an SmtpEmailService (or a provider SDK)
 * for staging/production by changing the binding in EmailModule.
 */
@Injectable()
export class ConsoleEmailService extends EmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`[EMAIL:console] to=${message.to} subject="${message.subject}"`);
  }
}
