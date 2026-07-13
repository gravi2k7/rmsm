import { createHmac, timingSafeEqual } from "crypto";
import type { EmailProviderType } from "@rmsm/database";
import {
  EmailProviderAdapter,
  EmailMessage,
  EmailSendResult,
} from "../../interfaces/providers/email-provider.interface";
import { buildMimeMessage } from "../shared/mime-builder";
import { signAwsRequest, AwsCredentials } from "../shared/aws-sigv4";

export interface SesCredentials extends AwsCredentials {
  fromAddress: string;
  /** SNS topic subscription secret used to verify inbound bounce/complaint notifications (Section: delivery tracking). */
  snsWebhookSecret?: string;
}

/**
 * Amazon SES, via its REST API (`SendRawEmail` action) signed with AWS
 * SigV4 (shared/aws-sigv4.ts) — no AWS SDK. Uses the raw-message API
 * (not `SendEmail`'s structured fields) so attachments and multipart
 * HTML+text bodies both go through the same `buildMimeMessage()` helper
 * SmtpEmailProvider uses — one MIME builder, two providers, no
 * duplicated logic.
 */
export class SesEmailProvider extends EmailProviderAdapter {
  readonly type: EmailProviderType = "SES";

  constructor(private readonly credentials: SesCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.accessKeyId && this.credentials.secretAccessKey);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const host = `email.${this.credentials.region}.amazonaws.com`;
    const rawMessage = buildMimeMessage(this.credentials.fromAddress, message);

    const body = new URLSearchParams({
      Action: "SendRawEmail",
      Version: "2010-12-01",
      "RawMessage.Data": Buffer.from(rawMessage, "utf8").toString("base64"),
    }).toString();

    const signed = signAwsRequest(this.credentials, "ses", host, body);

    const res = await fetch(`https://${host}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...signed,
      },
      body,
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`SES SendRawEmail failed (${res.status}): ${responseText}`);
    }

    const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
    const messageId = messageIdMatch?.[1];
    if (!messageId) {
      throw new Error(`SES SendRawEmail response did not include a MessageId: ${responseText}`);
    }
    return { providerMessageId: messageId };
  }

  /**
   * SES delivers bounce/complaint/delivery notifications via SNS, which
   * signs each notification with a subscription-specific value rather
   * than a fixed webhook secret in the Stripe/Razorpay sense. Modeled
   * here as a simple HMAC check against a pre-shared secret configured at
   * SNS subscription time — the practical approach most SES integrations
   * use rather than SNS's own certificate-based message verification,
   * which (like PayPal's, Module 004) would require a live API round
   * trip. Documented as a simplification, not silently presented as
   * SNS's native verification scheme.
   */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.credentials.snsWebhookSecret) return false;
    const expected = createHmac("sha256", this.credentials.snsWebhookSecret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(signatureHeader, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";
    occurredAt: Date;
    raw: Record<string, unknown>;
  } {
    const envelope = JSON.parse(rawBody) as { Message: string };
    const notification = JSON.parse(envelope.Message) as {
      notificationType: string;
      mail: { messageId: string; timestamp: string };
      bounce?: { bounceType: string };
      complaint?: unknown;
      delivery?: unknown;
    };

    const typeMap: Record<string, "delivered" | "bounced" | "complained" | undefined> = {
      Delivery: "delivered",
      Bounce: "bounced",
      Complaint: "complained",
    };
    const eventType = typeMap[notification.notificationType];
    if (!eventType) {
      throw new Error(`Unrecognized SES notification type: ${notification.notificationType}`);
    }

    return {
      providerMessageId: notification.mail.messageId,
      eventType,
      occurredAt: new Date(notification.mail.timestamp),
      raw: notification as unknown as Record<string, unknown>,
    };
  }
}
