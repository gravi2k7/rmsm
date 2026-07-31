import type { EmailProviderId, EmailQueueState, EmailSendMode, EmailTemplateId, EmailHealthStatus } from "../contracts/email-platform.contracts";

/**
 * The enterprise-grade message shape — deliberately NOT the same type as
 * `../email.service.interface.ts`'s `EmailMessage` (`{to, subject, html}`).
 * EM-001's own "Do NOT change existing EmailService abstraction" rule
 * means that narrow, three-field type (and the `EmailService.send()`
 * signature built on it) is frozen forever — `AuthService` depends on it
 * directly and is never touched by this milestone. This richer type is
 * what every *new* caller (the Provider layer, the Queue, and any future
 * RMSM module EM-001's own "Future RMSM modules must use this module"
 * note anticipates) should use going forward.
 */
export interface EmailAttachment {
  fileName: string;
  /** "application/pdf" | "text/csv" | "image/png" | ... — EM-001's own Attachments section names PDF/CSV/Images explicitly; any MIME type is accepted, those three are simply the ones this milestone's tests exercise. */
  mimeType: string;
  /** string = base64-encoded content — same convention the pre-existing `notifications` email-provider interface already uses, kept identical so a future consolidation has one fewer thing to reconcile. */
  content: Buffer | string;
}

export interface EnterpriseEmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  providerMessageId: string;
  provider: EmailProviderId;
}

export interface EmailSendOptions {
  mode?: EmailSendMode; // defaults to "IMMEDIATE"
  /** Required when mode = "SCHEDULED". */
  scheduledAt?: Date;
  /** Required when mode = "DELAYED" — milliseconds from now. */
  delayMs?: number;
  /** Correlates a queued/tracked send back to whatever business event triggered it (e.g. a userId, an orderId) — opaque to the platform itself. */
  correlationId?: string;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

export interface SendTemplateRequest {
  templateId: EmailTemplateId;
  to: string[];
  variables: TemplateVariables;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  options?: EmailSendOptions;
}

export interface EmailQueueItem {
  id: string;
  message: EnterpriseEmailMessage;
  state: EmailQueueState;
  mode: EmailSendMode;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  attempts: number;
  lastError?: string;
  correlationId?: string;
  result?: EmailSendResult;
}

export interface EmailTrackingRecord {
  messageId: string;
  provider: EmailProviderId;
  status: "SENT" | "DELIVERED" | "FAILED";
  retryCount: number;
  processingTimeMs: number;
  sentAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface EmailHealthSnapshot {
  status: EmailHealthStatus;
  provider: EmailProviderId;
  connectionOk: boolean;
  queueDepth: number;
  recentFailureRate: number;
  lastCheckedAt: Date;
  message: string;
}
