import { createHmac, timingSafeEqual } from "crypto";
import type { SmsProviderType } from "@rmsm/database";
import { SmsProviderAdapter, SmsMessage, SmsSendResult } from "../../interfaces/providers/sms-provider.interface";

export interface VonageCredentials {
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
  webhookSigningSecret?: string;
}

export class VonageProvider extends SmsProviderAdapter {
  readonly type: SmsProviderType = "VONAGE";
  private readonly apiBase = "https://rest.nexmo.com";

  constructor(private readonly credentials: VonageCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.apiKey && this.credentials.apiSecret);
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const res = await fetch(`${this.apiBase}/sms/json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_key: this.credentials.apiKey,
        api_secret: this.credentials.apiSecret,
        to: message.to,
        from: this.credentials.fromNumber,
        text: message.body,
      }),
    });
    const data = (await res.json()) as { messages: { status: string; "message-id": string; "error-text"?: string }[] };
    const first = data.messages[0];
    if (!first || first.status !== "0") {
      throw new Error(`Vonage send failed: ${first?.["error-text"] ?? "unknown error"}`);
    }
    return { providerMessageId: first["message-id"] };
  }

  /** Vonage's documented scheme: HMAC-SHA256 signed JWT-style signature over sorted params, using the account's signature secret. */
  async verifyWebhookSignature(_rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.credentials.webhookSigningSecret) return false;
    let parsed: { params: Record<string, string>; signature: string };
    try {
      parsed = JSON.parse(signatureHeader);
    } catch {
      return false;
    }
    const sortedKeys = Object.keys(parsed.params).sort();
    const dataToSign = sortedKeys.map((k) => `&${k}=${parsed.params[k]}`).join("");
    const expected = createHmac("sha256", this.credentials.webhookSigningSecret).update(dataToSign, "utf8").digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(parsed.signature, "utf8");
    return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "failed" | "undelivered";
    occurredAt: Date;
    raw: Record<string, unknown>;
  } {
    const payload = JSON.parse(rawBody) as { messageId: string; status: string; "date-time": string };

    const typeMap: Record<string, "delivered" | "failed" | "undelivered" | undefined> = {
      delivered: "delivered",
      failed: "failed",
      expired: "undelivered",
      rejected: "failed",
    };
    const eventType = typeMap[payload.status];
    if (!eventType) throw new Error(`Unrecognized Vonage status: ${payload.status}`);

    return {
      providerMessageId: payload.messageId,
      eventType,
      occurredAt: new Date(payload["date-time"]),
      raw: payload as unknown as Record<string, unknown>,
    };
  }
}
