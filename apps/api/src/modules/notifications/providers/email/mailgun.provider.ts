import { createHmac, timingSafeEqual } from "crypto";
import type { EmailProviderType } from "@rmsm/database";
import {
  EmailProviderAdapter,
  EmailMessage,
  EmailSendResult,
} from "../../interfaces/providers/email-provider.interface";

export interface MailgunCredentials {
  apiKey: string;
  domain: string;
  fromAddress: string;
  webhookSigningKey?: string;
  /** Mailgun has US and EU regional API bases. */
  apiBase?: string;
}

export class MailgunEmailProvider extends EmailProviderAdapter {
  readonly type: EmailProviderType = "MAILGUN";

  constructor(private readonly credentials: MailgunCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.apiKey && this.credentials.domain);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const base = this.credentials.apiBase ?? "https://api.mailgun.net/v3";
    const form = new URLSearchParams();
    form.set("from", this.credentials.fromAddress);
    message.to.forEach((to) => form.append("to", to));
    message.cc?.forEach((cc) => form.append("cc", cc));
    message.bcc?.forEach((bcc) => form.append("bcc", bcc));
    form.set("subject", message.subject);
    if (message.text) form.set("text", message.text);
    if (message.html) form.set("html", message.html);

    const credentials = Buffer.from(`api:${this.credentials.apiKey}`).toString("base64");
    const res = await fetch(`${base}/${this.credentials.domain}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });

    const data = (await res.json()) as { id: string; message?: string };
    if (!res.ok) throw new Error(`Mailgun send failed (${res.status}): ${data.message ?? "unknown error"}`);
    return { providerMessageId: data.id };
  }

  /** Mailgun's documented scheme: HMAC-SHA256 over `timestamp + token` using the account's webhook signing key. */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.credentials.webhookSigningKey) return false;
    let parsed: { timestamp: string; token: string; signature: string };
    try {
      parsed = JSON.parse(signatureHeader);
    } catch {
      return false;
    }
    const expected = createHmac("sha256", this.credentials.webhookSigningKey)
      .update(`${parsed.timestamp}${parsed.token}`)
      .digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(parsed.signature, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";
    occurredAt: Date;
    raw: Record<string, unknown>;
  } {
    const payload = JSON.parse(rawBody) as {
      "event-data": {
        event: string;
        timestamp: number;
        message: { headers: { "message-id": string } };
      };
    };
    const eventData = payload["event-data"];

    const typeMap: Record<string, "delivered" | "opened" | "clicked" | "bounced" | "complained" | undefined> = {
      delivered: "delivered",
      opened: "opened",
      clicked: "clicked",
      failed: "bounced",
      complained: "complained",
    };
    const eventType = typeMap[eventData.event];
    if (!eventType) throw new Error(`Unrecognized Mailgun event type: ${eventData.event}`);

    return {
      providerMessageId: eventData.message.headers["message-id"],
      eventType,
      occurredAt: new Date(eventData.timestamp * 1000),
      raw: eventData as unknown as Record<string, unknown>,
    };
  }
}
