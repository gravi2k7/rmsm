import { Injectable, Logger } from "@nestjs/common";
import type { EmailProvider } from "../email-provider.interface";
import type { EnterpriseEmailMessage, EmailSendResult } from "../../types/email-platform.types";
import type { EmailProviderError } from "../../errors/email-error-mapper";

export interface ResendProviderConfig {
  apiKey: string;
  from: string;
  timeoutMs: number;
}

const RESEND_API_BASE = "https://api.resend.com";

function toResendFailure(status: number, body: unknown): EmailProviderError {
  const message = typeof body === "object" && body !== null && "message" in body ? String((body as { message?: unknown }).message) : `Resend API error (${status})`;
  if (status === 401 || status === 403) return { isAuthenticationFailure: true, httpStatus: status, message };
  if (status === 422) return { isInvalidRecipient: true, httpStatus: status, message };
  if (status === 429) return { isRateLimit: true, httpStatus: status, message };
  if (status === 502 || status === 503 || status === 504) return { isProviderUnavailable: true, httpStatus: status, message };
  return { httpStatus: status, message };
}

/**
 * EM-001's own Resend Provider section: API Key, Sender, HTML, Plain
 * Text, Attachments, Reply-To — every one mapped directly onto Resend's
 * `POST /emails` JSON body. Raw `fetch`, no `resend` npm SDK — same "no
 * vendor SDK coupling" convention this project has followed for every
 * other REST-only provider integration since MD-001 (Resend's HTTP API
 * is simple enough that a dependency isn't warranted, unlike SMTP, which
 * EM-001 explicitly asks to use Nodemailer for).
 */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly type = "RESEND" as const;
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly config: ResendProviderConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.apiKey);
  }

  async send(message: EnterpriseEmailMessage): Promise<EmailSendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(`${RESEND_API_BASE}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.config.from,
          to: message.to,
          cc: message.cc,
          bcc: message.bcc,
          reply_to: message.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text,
          attachments: message.attachments?.map((a) => ({
            filename: a.fileName,
            content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
          })),
        }),
        signal: controller.signal,
      });

      const data = (await res.json()) as { id: string; message?: string };
      if (!res.ok) throw toResendFailure(res.status, data);

      this.logger.log({ msg: "email.resend.sent", providerMessageId: data.id, to: message.to.length });
      return { providerMessageId: data.id, provider: "RESEND" };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutError: EmailProviderError = { isTimeout: true, message: `Resend request exceeded ${this.config.timeoutMs}ms` };
        this.logger.warn({ msg: "email.resend.timeout" });
        throw timeoutError;
      }
      if (typeof err === "object" && err !== null && ("httpStatus" in err || "isInvalidRecipient" in err || "isAuthenticationFailure" in err || "isRateLimit" in err || "isProviderUnavailable" in err)) {
        this.logger.warn({ msg: "email.resend.failed" });
        throw err;
      }
      const networkError: EmailProviderError = { isProviderUnavailable: true, message: err instanceof Error ? err.message : "Unknown network failure" };
      this.logger.warn({ msg: "email.resend.network_error" });
      throw networkError;
    } finally {
      clearTimeout(timer);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const res = await fetch(`${RESEND_API_BASE}/domains`, { headers: { Authorization: `Bearer ${this.config.apiKey}` }, signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }
}
