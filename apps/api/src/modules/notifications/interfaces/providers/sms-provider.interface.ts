import type { SmsProviderType } from "@rmsm/database";

export interface SmsMessage {
  to: string;
  body: string;
  metadata?: Record<string, string>;
}

export interface SmsSendResult {
  providerMessageId: string;
}

export abstract class SmsProviderAdapter {
  abstract readonly type: SmsProviderType;
  abstract readonly enabled: boolean;

  abstract send(message: SmsMessage): Promise<SmsSendResult>;

  abstract verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean>;

  abstract parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "failed" | "undelivered";
    occurredAt: Date;
    raw: Record<string, unknown>;
  };
}
