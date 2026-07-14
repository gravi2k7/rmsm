import { createHmac, timingSafeEqual } from "crypto";
import type { SmsProviderType } from "@rmsm/database";
import { SmsProviderAdapter, SmsMessage, SmsSendResult } from "../../interfaces/providers/sms-provider.interface";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class TwilioProvider extends SmsProviderAdapter {
  readonly type: SmsProviderType = "TWILIO";

  constructor(private readonly credentials: TwilioCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.accountSid && this.credentials.authToken);
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.credentials.accountSid}:${this.credentials.authToken}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: message.to, From: this.credentials.fromNumber, Body: message.body }),
    });
    const data = (await res.json()) as { sid: string; message?: string };
    if (!res.ok) throw new Error(`Twilio send failed (${res.status}): ${data.message ?? "unknown error"}`);
    return { providerMessageId: data.sid };
  }

  /**
   * Twilio's documented scheme: HMAC-SHA1 over the full webhook URL
   * concatenated with each POST param (sorted by key, key+value
   * concatenated with no separator), base64-encoded, compared against
   * `X-Twilio-Signature`. `signatureHeader` here is expected to be a
   * JSON bundle of `{url, params, signature}` — assembled by the caller
   * from the actual request, since this method has no access to the
   * request object itself, matching the same "caller bundles what the
   * provider's scheme needs" pattern used for PayPal (Module 004) and
   * Resend (this phase).
   */
  async verifyWebhookSignature(_rawBody: string, signatureHeader: string): Promise<boolean> {
    let parsed: { url: string; params: Record<string, string>; signature: string };
    try {
      parsed = JSON.parse(signatureHeader);
    } catch {
      return false;
    }

    const sortedKeys = Object.keys(parsed.params).sort();
    const dataToSign = sortedKeys.reduce((acc, key) => acc + key + parsed.params[key], parsed.url);
    const expected = createHmac("sha1", this.credentials.authToken).update(dataToSign, "utf8").digest("base64");

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
    const params = new URLSearchParams(rawBody);
    const status = params.get("MessageStatus");
    const sid = params.get("MessageSid");
    if (!sid) throw new Error("Twilio webhook payload missing MessageSid");

    const typeMap: Record<string, "delivered" | "failed" | "undelivered" | undefined> = {
      delivered: "delivered",
      failed: "failed",
      undelivered: "undelivered",
    };
    const eventType = typeMap[status ?? ""];
    if (!eventType) throw new Error(`Unrecognized Twilio message status: ${status}`);

    return {
      providerMessageId: sid,
      eventType,
      occurredAt: new Date(),
      raw: Object.fromEntries(params.entries()),
    };
  }
}
