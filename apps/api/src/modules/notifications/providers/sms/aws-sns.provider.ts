import { createHmac, timingSafeEqual } from "crypto";
import type { SmsProviderType } from "@rmsm/database";
import { SmsProviderAdapter, SmsMessage, SmsSendResult } from "../../interfaces/providers/sms-provider.interface";
import { signAwsRequest, AwsCredentials } from "../shared/aws-sigv4";

export interface AwsSnsCredentials extends AwsCredentials {
  webhookSecret?: string;
}

export class AwsSnsProvider extends SmsProviderAdapter {
  readonly type: SmsProviderType = "AWS_SNS";

  constructor(private readonly credentials: AwsSnsCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.accessKeyId && this.credentials.secretAccessKey);
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const host = `sns.${this.credentials.region}.amazonaws.com`;
    const body = new URLSearchParams({
      Action: "Publish",
      Version: "2010-03-31",
      PhoneNumber: message.to,
      Message: message.body,
    }).toString();

    const signed = signAwsRequest(this.credentials, "sns", host, body);
    const res = await fetch(`https://${host}/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...signed },
      body,
    });

    const responseText = await res.text();
    if (!res.ok) throw new Error(`SNS Publish failed (${res.status}): ${responseText}`);

    const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
    const messageId = messageIdMatch?.[1];
    if (!messageId) throw new Error(`SNS Publish response did not include a MessageId: ${responseText}`);
    return { providerMessageId: messageId };
  }

  /** Same simplified pre-shared-secret HMAC approach as SesEmailProvider's SNS-delivered bounce notifications — see that file's comment for why this isn't SNS's native certificate-based verification. */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.credentials.webhookSecret) return false;
    const expected = createHmac("sha256", this.credentials.webhookSecret).update(rawBody, "utf8").digest("hex");
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
    const envelope = JSON.parse(rawBody) as { Message: string };
    const notification = JSON.parse(envelope.Message) as {
      status: string;
      notification: { messageId: string; timestamp: string };
    };

    const typeMap: Record<string, "delivered" | "failed" | "undelivered" | undefined> = {
      SUCCESS: "delivered",
      FAILURE: "failed",
    };
    const eventType = typeMap[notification.status];
    if (!eventType) throw new Error(`Unrecognized SNS delivery status: ${notification.status}`);

    return {
      providerMessageId: notification.notification.messageId,
      eventType,
      occurredAt: new Date(notification.notification.timestamp),
      raw: notification as unknown as Record<string, unknown>,
    };
  }
}
