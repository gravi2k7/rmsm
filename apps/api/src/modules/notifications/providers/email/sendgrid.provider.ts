import { createVerify } from "crypto";
import type { EmailProviderType } from "@rmsm/database";
import {
  EmailProviderAdapter,
  EmailMessage,
  EmailSendResult,
} from "../../interfaces/providers/email-provider.interface";

export interface SendGridCredentials {
  apiKey: string;
  fromAddress: string;
  fromName?: string;
  /** SendGrid's Event Webhook public key (ECDSA), used to verify the `X-Twilio-Email-Event-Webhook-Signature` header. */
  webhookVerificationKey?: string;
}

export class SendGridEmailProvider extends EmailProviderAdapter {
  readonly type: EmailProviderType = "SENDGRID";
  private readonly apiBase = "https://api.sendgrid.com/v3";

  constructor(private readonly credentials: SendGridCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.apiKey);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const res = await fetch(`${this.apiBase}/mail/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: message.to.map((email) => ({ email })),
            cc: message.cc?.map((email) => ({ email })),
            bcc: message.bcc?.map((email) => ({ email })),
          },
        ],
        from: { email: this.credentials.fromAddress, name: this.credentials.fromName },
        subject: message.subject,
        content: [
          ...(message.text ? [{ type: "text/plain", value: message.text }] : []),
          ...(message.html ? [{ type: "text/html", value: message.html }] : []),
        ],
        attachments: message.attachments?.map((a) => ({
          filename: a.fileName,
          type: a.mimeType,
          content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
        })),
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`SendGrid send failed (${res.status}): ${errorBody}`);
    }

    // SendGrid returns the message id in the X-Message-Id response header, not the body.
    const providerMessageId = res.headers.get("x-message-id") ?? `sendgrid_${Date.now()}`;
    return { providerMessageId };
  }

  /**
   * SendGrid's Event Webhook signs with ECDSA (public key verification),
   * not a shared-secret HMAC — verified via Node's `crypto.createVerify`
   * against the public key SendGrid's dashboard provides at webhook
   * setup, per SendGrid's documented scheme.
   */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.credentials.webhookVerificationKey) return false;
    try {
      const [timestamp, signature] = signatureHeader.split(",");
      if (!timestamp || !signature) return false;
      const verifier = createVerify("SHA256");
      verifier.update(timestamp + rawBody);
      verifier.end();
      const publicKey = `-----BEGIN PUBLIC KEY-----\n${this.credentials.webhookVerificationKey}\n-----END PUBLIC KEY-----`;
      return verifier.verify(publicKey, Buffer.from(signature, "base64"));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";
    occurredAt: Date;
    raw: Record<string, unknown>;
  } {
    const events = JSON.parse(rawBody) as {
      sg_message_id: string;
      event: string;
      timestamp: number;
    }[];
    const event = events[0];
    if (!event) throw new Error("SendGrid webhook payload contained no events");

    const typeMap: Record<string, "delivered" | "opened" | "clicked" | "bounced" | "complained" | undefined> = {
      delivered: "delivered",
      open: "opened",
      click: "clicked",
      bounce: "bounced",
      spamreport: "complained",
    };
    const eventType = typeMap[event.event];
    if (!eventType) throw new Error(`Unrecognized SendGrid event type: ${event.event}`);

    return {
      providerMessageId: event.sg_message_id,
      eventType,
      occurredAt: new Date(event.timestamp * 1000),
      raw: event as unknown as Record<string, unknown>,
    };
  }
}
