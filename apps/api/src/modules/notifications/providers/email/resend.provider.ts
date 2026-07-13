import { createHmac, timingSafeEqual } from "crypto";
import type { EmailProviderType } from "@rmsm/database";
import {
  EmailProviderAdapter,
  EmailMessage,
  EmailSendResult,
} from "../../interfaces/providers/email-provider.interface";

export interface ResendCredentials {
  apiKey: string;
  fromAddress: string;
  /** Svix-based webhook signing secret (Resend delegates webhook delivery to Svix). */
  webhookSecret?: string;
}

export class ResendEmailProvider extends EmailProviderAdapter {
  readonly type: EmailProviderType = "RESEND";
  private readonly apiBase = "https://api.resend.com";

  constructor(private readonly credentials: ResendCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.apiKey);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const res = await fetch(`${this.apiBase}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.credentials.fromAddress,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.fileName,
          content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
        })),
      }),
    });

    const data = (await res.json()) as { id: string; message?: string };
    if (!res.ok) throw new Error(`Resend send failed (${res.status}): ${data.message ?? "unknown error"}`);
    return { providerMessageId: data.id };
  }

  /**
   * Resend's webhooks are delivered via Svix, which signs with
   * `svix-id.svix-timestamp.rawBody` HMAC-SHA256, base64-encoded — the
   * `signatureHeader` here is expected to be a JSON bundle of
   * `{svixId, svixTimestamp, svixSignature}`, assembled by the caller
   * (WebhookController, Phase 3) from Svix's three separate headers, the
   * same "caller assembles a multi-header bundle" pattern
   * PayPalProvider (Module 004) established for its own multi-header
   * verification requirement.
   */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.credentials.webhookSecret) return false;
    let parsed: { svixId: string; svixTimestamp: string; svixSignature: string };
    try {
      parsed = JSON.parse(signatureHeader);
    } catch {
      return false;
    }

    const signedContent = `${parsed.svixId}.${parsed.svixTimestamp}.${rawBody}`;
    // Svix secrets are prefixed "whsec_" and base64-encoded after that prefix.
    const secretBytes = Buffer.from(this.credentials.webhookSecret.replace(/^whsec_/, ""), "base64");
    const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

    const providedSignatures = parsed.svixSignature
      .split(" ")
      .map((s) => s.split(",")[1])
      .filter((s): s is string => Boolean(s));
    return providedSignatures.some((sig) => {
      const expectedBuf = Buffer.from(expected, "utf8");
      const providedBuf = Buffer.from(sig, "utf8");
      return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
    });
  }

  parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";
    occurredAt: Date;
    raw: Record<string, unknown>;
  } {
    const payload = JSON.parse(rawBody) as {
      type: string;
      created_at: string;
      data: { email_id: string };
    };

    const typeMap: Record<string, "delivered" | "opened" | "clicked" | "bounced" | "complained" | undefined> = {
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };
    const eventType = typeMap[payload.type];
    if (!eventType) throw new Error(`Unrecognized Resend event type: ${payload.type}`);

    return {
      providerMessageId: payload.data.email_id,
      eventType,
      occurredAt: new Date(payload.created_at),
      raw: payload as unknown as Record<string, unknown>,
    };
  }
}
