import { connect as http2Connect, constants as http2Constants } from "http2";
import type { PushProviderType } from "@rmsm/database";
import {
  PushProviderAdapter,
  PushMessage,
  PushSendResult,
  PushInvalidTokenError,
} from "../../interfaces/providers/push-provider.interface";
import { signJwt } from "../shared/jwt-sign";

export interface ApnsCredentials {
  teamId: string;
  keyId: string;
  /** The .p8 private key file content. */
  privateKey: string;
  bundleId: string;
  /** Apple provides separate sandbox and production APNs hosts. */
  production: boolean;
}

/**
 * Apple Push Notification Service via its HTTP/2 API — Node's built-in
 * `http2` module (HTTP/2 is mandatory for APNs, unlike every other
 * provider in this module which uses plain `fetch`/HTTP/1.1), token-based
 * auth via an ES256-signed JWT (no vendor library). The auth token is
 * cached for up to 55 minutes (Apple's stated 1-hour validity), same
 * caching approach as FcmPushProvider's OAuth2 token.
 */
export class ApnsPushProvider extends PushProviderAdapter {
  readonly type: PushProviderType = "APNS";

  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly credentials: ApnsCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.teamId && this.credentials.keyId && this.credentials.privateKey);
  }

  private getAuthToken(): string {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }

    const now = Math.floor(Date.now() / 1000);
    const jwt = signJwt(
      { alg: "ES256", kid: this.credentials.keyId },
      { iss: this.credentials.teamId, iat: now },
      this.credentials.privateKey,
      "ES256",
    );
    this.cachedToken = { value: jwt, expiresAt: Date.now() + 55 * 60 * 1000 };
    return jwt;
  }

  async send(message: PushMessage): Promise<PushSendResult> {
    const host = this.credentials.production ? "api.push.apple.com" : "api.sandbox.push.apple.com";
    const client = http2Connect(`https://${host}`);

    try {
      const payload = JSON.stringify({
        aps: {
          alert: { title: message.title, body: message.body },
          badge: message.badge,
          sound: message.sound,
        },
        ...message.data,
      });

      const result = await new Promise<{ status: number; apnsId?: string; reason?: string }>((resolve, reject) => {
        const req = client.request({
          [http2Constants.HTTP2_HEADER_METHOD]: "POST",
          [http2Constants.HTTP2_HEADER_PATH]: `/3/device/${message.deviceToken}`,
          authorization: `bearer ${this.getAuthToken()}`,
          "apns-topic": this.credentials.bundleId,
          "apns-push-type": "alert",
          "content-type": "application/json",
        });

        let responseBody = "";
        let statusCode = 0;
        req.on("response", (headers) => {
          statusCode = Number(headers[http2Constants.HTTP2_HEADER_STATUS]);
        });
        req.on("data", (chunk) => {
          responseBody += chunk;
        });
        req.on("end", () => {
          const apnsId = req.sentHeaders?.["apns-id"] as string | undefined;
          try {
            const parsed = responseBody ? (JSON.parse(responseBody) as { reason?: string }) : {};
            resolve({ status: statusCode, apnsId, reason: parsed.reason });
          } catch {
            resolve({ status: statusCode, apnsId });
          }
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
      });

      if (result.status !== 200) {
        if (result.reason === "BadDeviceToken" || result.reason === "Unregistered") {
          throw Object.assign(new Error(result.reason), {
            invalidToken: {
              deviceToken: message.deviceToken,
              reason: result.reason === "Unregistered" ? "unregistered" : "invalid",
            } satisfies PushInvalidTokenError,
          });
        }
        throw new Error(`APNs send failed (${result.status}): ${result.reason ?? "unknown reason"}`);
      }

      return { providerMessageId: result.apnsId ?? `apns_${Date.now()}` };
    } finally {
      client.close();
    }
  }

  async sendBatch(messages: PushMessage[]): Promise<(PushSendResult | PushInvalidTokenError)[]> {
    return Promise.all(
      messages.map(async (message) => {
        try {
          return await this.send(message);
        } catch (error) {
          const invalidToken = (error as { invalidToken?: PushInvalidTokenError }).invalidToken;
          if (invalidToken) return invalidToken;
          throw error;
        }
      }),
    );
  }
}
