import { createHmac, timingSafeEqual } from "crypto";
import type { SmsProviderType } from "@rmsm/database";
import { SmsProviderAdapter, SmsMessage, SmsSendResult } from "../../interfaces/providers/sms-provider.interface";

export interface MessageBirdCredentials {
  accessKey: string;
  fromNumber: string;
  webhookSigningKey?: string;
}

export class MessageBirdProvider extends SmsProviderAdapter {
  readonly type: SmsProviderType = "MESSAGEBIRD";
  private readonly apiBase = "https://rest.messagebird.com";

  constructor(private readonly credentials: MessageBirdCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.accessKey);
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const res = await fetch(`${this.apiBase}/messages`, {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${this.credentials.accessKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ originator: this.credentials.fromNumber, recipients: [message.to], body: message.body }),
    });
    const data = (await res.json()) as { id: string; errors?: { description: string }[] };
    if (!res.ok) throw new Error(`MessageBird send failed (${res.status}): ${data.errors?.[0]?.description ?? "unknown error"}`);
    return { providerMessageId: data.id };
  }

  /** MessageBird's documented scheme: HMAC-SHA256 over the raw request body using the signing key from the webhook configuration. */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.credentials.webhookSigningKey) return false;
    const expected = createHmac("sha256", this.credentials.webhookSigningKey).update(rawBody, "utf8").digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(signatureHeader, "utf8");
    return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "failed" | "undelivered";
    occurredAt: Date;
    raw: Record<string, unknown>;
  } {
    const payload = JSON.parse(rawBody) as { id: string; status: string; statusDatetime: string };

    const typeMap: Record<string, "delivered" | "failed" | "undelivered" | undefined> = {
      delivered: "delivered",
      delivery_failed: "failed",
      expired: "undelivered",
    };
    const eventType = typeMap[payload.status];
    if (!eventType) throw new Error(`Unrecognized MessageBird status: ${payload.status}`);

    return {
      providerMessageId: payload.id,
      eventType,
      occurredAt: new Date(payload.statusDatetime),
      raw: payload as unknown as Record<string, unknown>,
    };
  }
}
