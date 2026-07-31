import { Injectable } from "@nestjs/common";
import { EmailService, EmailMessage } from "../email.service.interface";
import { EmailQueueService } from "./queue/email-queue.service";
import { TemplateRenderer } from "./template-engine/template-renderer";
import { TemplateRegistry } from "./template-engine/template-registry";
import type { EnterpriseEmailMessage, EmailSendOptions, EmailQueueItem, SendTemplateRequest } from "./types/email-platform.types";

/**
 * The concrete class `EmailModule` binds the frozen `EmailService` token
 * to (replacing the old direct `ConsoleEmailService` binding).
 * `send()` — the ONLY method `AuthService` calls — preserves the exact
 * `EmailMessage {to, subject, html} -> Promise<void>` contract byte for
 * byte; everything else on this class (`sendEnterprise`/`sendTemplate`)
 * is new surface for the callers EM-001's own "Future RMSM modules must
 * use this module instead of implementing their own email logic" note
 * anticipates.
 *
 * `send()` enqueues in `"IMMEDIATE"` mode and awaits it, so a real
 * provider failure (after retries are exhausted) throws through exactly
 * the way `AuthService`'s own `await this.emailService.send(...)` call
 * sites (none of which currently wrap it in try/catch) expect — this is
 * not a behavior change from today's `ConsoleEmailService` (which can
 * never fail), only a behavior *completion*: today nothing can throw
 * because there's no real provider yet; once one is configured, a
 * genuine delivery failure surfacing as a thrown error rather than a
 * silently "successful" registration/verification flow is the correct,
 * expected behavior, not a regression.
 */
@Injectable()
export class EnterpriseEmailService extends EmailService {
  constructor(
    private readonly queue: EmailQueueService,
    private readonly renderer: TemplateRenderer,
    private readonly templates: TemplateRegistry,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const enterpriseMessage: EnterpriseEmailMessage = { to: [message.to], subject: message.subject, html: message.html };
    await this.queue.enqueue(enterpriseMessage, { mode: "IMMEDIATE" });
  }

  /** The enterprise entry point for callers that need cc/bcc/attachments/reply-to or non-immediate delivery — returns the queue item (with `.result` once completed) rather than throwing on a deferred (scheduled/delayed) failure, since there's no synchronous caller left to receive that throw. */
  async sendEnterprise(message: EnterpriseEmailMessage, options?: EmailSendOptions): Promise<EmailQueueItem> {
    return this.queue.enqueue(message, options);
  }

  /** Renders one of the 26 named enterprise templates (`TemplateRegistry`) and enqueues it — the API every *new* RMSM module (Organization invitations, Security alerts, Billing, AI Platform, Portfolio summaries, System notices) should call instead of hand-rolling its own subject/html strings, per EM-001's own "Future RMSM modules must use this module" note. */
  async sendTemplate(request: SendTemplateRequest): Promise<EmailQueueItem> {
    const definition = this.templates.get(request.templateId);
    const rendered = this.renderer.render(definition, request.variables);
    const message: EnterpriseEmailMessage = {
      to: request.to,
      cc: request.cc,
      bcc: request.bcc,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: request.attachments,
    };
    return this.queue.enqueue(message, request.options);
  }
}
