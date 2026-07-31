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
  this.logger.log("========================================");
  this.logger.log("[EMAIL:console]");
  this.logger.log(`To      : ${message.to}`);
  this.logger.log(`Subject : ${message.subject}`);

  this.logger.log("HTML:");
  this.logger.log(message.html);

  const match = message.html.match(/https?:\/\/[^\s"'<>]+/);

  if (match) {
    this.logger.log(`Verification URL: ${match[0]}`);
  }
  this.logger.log("========================================");

  
  if (message.html) {
    this.logger.log("HTML:");
    this.logger.log(message.html);
  }

  this.logger.log("========================================");  }
}
