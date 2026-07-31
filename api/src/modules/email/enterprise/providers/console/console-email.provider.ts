import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { EmailProvider } from "../email-provider.interface";
import type { EnterpriseEmailMessage, EmailSendResult } from "../../types/email-platform.types";
import { ConsoleEmailService } from "../../../console-email.service";

/**
 * Wraps the pre-existing `ConsoleEmailService` (`../../../console-email.service.ts`,
 * untouched by this milestone) rather than reimplementing its logging —
 * the exact "no duplicate code" instinct BR-001's `MetaTrader5Provider`
 * applied to its own `authService` adapter. `EnterpriseEmailService`'s
 * default (`EMAIL_PROVIDER=console`) resolves to this provider, so the
 * console-mode dev experience — the one Authentication's verification
 * emails rely on today — is byte-for-byte the same log output as before;
 * this class only adds the extra enterprise fields (cc/bcc/attachments)
 * as additional log lines when present, never removing or reordering
 * `ConsoleEmailService`'s own output.
 */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  readonly type = "CONSOLE" as const;
  readonly enabled = true; // Console is always available — it's the zero-setup dev/local default.

  private readonly logger = new Logger(ConsoleEmailProvider.name);
  private readonly delegate = new ConsoleEmailService();

  async send(message: EnterpriseEmailMessage): Promise<EmailSendResult> {
    // Delegates the core to/subject/html logging to the existing service —
    // identical output to the pre-EM-001 console flow for the fields it
    // already knew about.
    await this.delegate.send({ to: message.to[0] ?? "", subject: message.subject, html: message.html ?? "" });

    if (message.to.length > 1) this.logger.log(`Additional recipients: ${message.to.slice(1).join(", ")}`);
    if (message.cc?.length) this.logger.log(`Cc: ${message.cc.join(", ")}`);
    if (message.bcc?.length) this.logger.log(`Bcc: ${message.bcc.join(", ")}`);
    if (message.attachments?.length) this.logger.log(`Attachments: ${message.attachments.map((a) => a.fileName).join(", ")}`);

    return { providerMessageId: `console_${randomUUID()}`, provider: "CONSOLE" };
  }

  async verifyConnection(): Promise<boolean> {
    return true; // Nothing to connect to — logging can't fail.
  }
}
