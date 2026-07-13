import type { EmailProviderType, SmsProviderType, PushProviderType, NotificationTemplate, NotificationChannel } from "@rmsm/database";
import type { EmailProviderAdapter } from "../providers/email-provider.interface";
import type { SmsProviderAdapter } from "../providers/sms-provider.interface";
import type { PushProviderAdapter } from "../providers/push-provider.interface";
import type { QueueJob, EnqueueOptions } from "../queue-adapter.interface";
import type { RenderedContent } from "../template-engine.interface";

/**
 * Same registry shape as Module 004's PaymentProviderRegistry, with one
 * necessary correction found while implementing it for real (Phase 2b):
 * `get()`/`getDefault()` are `async`, not synchronous. Module 004's
 * payment providers each had exactly one platform-wide instance,
 * constructed once at DI-container startup from static env config — a
 * synchronous in-memory map lookup was correct for that shape. Module
 * 005's providers are explicitly per-organization configurable
 * (`EmailProvider.organizationId`, credentials stored per-row in the
 * database), so resolving "the SendGrid adapter for organization X" is a
 * database lookup (which row, whose credentials) before it's an adapter
 * construction — inherently async, the same category of Phase-1-interface
 * correction as Module 004's `verifyWebhookSignature` fix. Fixed here,
 * before any implementation depends on the wrong signature.
 */
export interface IProviderRegistry<TProviderType extends string, TAdapter> {
  get(organizationId: string | null, type: TProviderType): Promise<TAdapter>;
  getDefault(organizationId: string | null): Promise<TAdapter>;
  listEnabled(organizationId: string | null): Promise<TProviderType[]>;
}

export type IEmailProviderRegistry = IProviderRegistry<EmailProviderType, EmailProviderAdapter>;
export type ISmsProviderRegistry = IProviderRegistry<SmsProviderType, SmsProviderAdapter>;
export type IPushProviderRegistry = IProviderRegistry<PushProviderType, PushProviderAdapter>;

/** Decrypts stored provider credentials and constructs the correct adapter instance — the "factory" half of registry+factory, kept as a separate contract since credential decryption (Module 002-style AES-256-GCM, per the schema's credentialsEnc columns) is a distinct responsibility from adapter lookup/caching. */
export interface IProviderFactory {
  createEmailAdapter(providerType: EmailProviderType, encryptedCredentials: string): EmailProviderAdapter;
  createSmsAdapter(providerType: SmsProviderType, encryptedCredentials: string): SmsProviderAdapter;
  createPushAdapter(providerType: PushProviderType, encryptedCredentials: string): PushProviderAdapter;
}

export interface IQueueService {
  enqueue<T>(payload: T, options: EnqueueOptions): Promise<QueueJob<T>>;
  processQueue(queueName: string, batchSize: number): Promise<void>;
  retryFailed(queueName: string): Promise<number>;
  moveToDeadLetter(jobId: string, queueName: string, reason: string): Promise<void>;
}

export interface ITemplateService {
  render(organizationId: string | null, templateKey: string, locale: string, variables: Record<string, unknown>): Promise<RenderedContent>;
  create(data: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
  update(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
  validate(templateBody: string): { valid: boolean; errors: string[] };
}

export interface IPreferenceService {
  /** The single check every send path calls before enqueueing — combines opt-in/out, quiet hours, and digest-redirect logic into one decision. */
  isAllowed(userId: string, organizationId: string, categoryKey: string | undefined, channel: NotificationChannel): Promise<{ allowed: boolean; redirectToDigest: boolean; reason?: string }>;
  setPreference(userId: string, organizationId: string, categoryKey: string | null, channel: NotificationChannel | null, enabled: boolean): Promise<void>;
  getOrganizationDefaults(organizationId: string): Promise<Record<string, boolean>>;
}
