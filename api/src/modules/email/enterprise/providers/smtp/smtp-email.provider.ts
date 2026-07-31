import { Injectable, Logger } from "@nestjs/common";
import nodemailer, { Transporter } from "nodemailer";
import type { EmailProvider } from "../email-provider.interface";
import type { EnterpriseEmailMessage, EmailSendResult } from "../../types/email-platform.types";
import type { EmailProviderError } from "../../errors/email-error-mapper";

export interface SmtpProviderConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  /** BR-001's own precedent — nodemailer already distinguishes implicit TLS (`secure: true`, typically port 465) from opportunistic STARTTLS (`secure: false`, typically port 587, upgraded automatically when the server advertises it). EM-001's own Configuration example only names one flag, `SMTP_TLS` — this maps it to `secure` when the configured port is 465 and to `requireTLS` (forcing the STARTTLS upgrade rather than silently falling back to plaintext) otherwise, so "TLS" and "SSL" (both named in EM-001's own SMTP Provider section) are both genuinely covered by one env var. */
  tls: boolean;
  pool: boolean;
  maxConnections: number;
  timeoutMs: number;
  from: string;
}

function toSmtpFailure(err: unknown): EmailProviderError {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as { responseCode?: number })?.responseCode;
  if (code === 535 || code === 534 || code === 530) return { isAuthenticationFailure: true, smtpCode: code, message };
  if (code === 550 || code === 551 || code === 553) return { isInvalidRecipient: true, smtpCode: code, message };
  if ((err as { code?: string })?.code === "ETIMEDOUT" || (err as { code?: string })?.code === "ESOCKET") return { isTimeout: true, message };
  return { isSmtpFailure: true, smtpCode: code, message };
}

/**
 * BR-001's Client-responsibility list is the precedent — EM-001's own SMTP
 * Provider section explicitly says "Use Nodemailer," so (unlike this
 * project's other protocol integrations, which generally avoid an SDK)
 * this provider is a thin wrapper over `nodemailer.createTransport()`
 * rather than a hand-rolled RFC 5321 client. Support for Host/Port/
 * Username/Password/TLS/SSL/Authentication/Connection Pool/Timeout — all
 * named in EM-001's own section — maps directly onto nodemailer's own
 * transport options.
 */
@Injectable()
export class SMTPEmailProvider implements EmailProvider {
  readonly type = "SMTP" as const;
  private readonly logger = new Logger(SMTPEmailProvider.name);
  private transporter: Transporter | undefined;

  constructor(private readonly config: SmtpProviderConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.host);
  }

  async send(message: EnterpriseEmailMessage): Promise<EmailSendResult> {
    try {
      const info = await this.getTransporter().sendMail({
        from: this.config.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.fileName,
          contentType: a.mimeType,
          content: a.content,
          encoding: typeof a.content === "string" ? "base64" : undefined,
        })),
      });
      this.logger.log({ msg: "email.smtp.sent", messageId: info.messageId, to: message.to.length, accepted: info.accepted?.length ?? 0 });
      return { providerMessageId: info.messageId, provider: "SMTP" };
    } catch (err) {
      this.logger.warn({ msg: "email.smtp.failed", to: message.to.length });
      throw toSmtpFailure(err);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.getTransporter().verify();
      return true;
    } catch {
      return false;
    }
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const secure = this.config.tls && this.config.port === 465;
      const requireTLS = this.config.tls && this.config.port !== 465;
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure,
        requireTLS,
        auth: this.config.username ? { user: this.config.username, pass: this.config.password } : undefined,
        pool: this.config.pool,
        maxConnections: this.config.maxConnections,
        connectionTimeout: this.config.timeoutMs,
        greetingTimeout: this.config.timeoutMs,
        socketTimeout: this.config.timeoutMs,
      });
    }
    return this.transporter;
  }
}
