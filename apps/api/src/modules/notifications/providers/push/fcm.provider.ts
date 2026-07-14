import type { PushProviderType } from "@rmsm/database";
import {
  PushProviderAdapter,
  PushMessage,
  PushSendResult,
  PushInvalidTokenError,
} from "../../interfaces/providers/push-provider.interface";
import { signJwt } from "../shared/jwt-sign";

export interface FcmCredentials {
  /** The full downloaded service-account JSON key content. */
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Firebase Cloud Messaging via the HTTP v1 API — Google's OAuth2
 * service-account JWT-bearer flow implemented directly (RS256-signed JWT
 * → exchanged for a bearer token at Google's token endpoint), no
 * `firebase-admin` SDK. Cached in-memory for the token's lifetime (~1hr)
 * to avoid re-signing/exchanging a JWT on every single send.
 */
export class FcmPushProvider extends PushProviderAdapter {
  readonly type: PushProviderType = "FCM";

  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly credentials: FcmCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.projectId && this.credentials.clientEmail && this.credentials.privateKey);
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }

    const now = Math.floor(Date.now() / 1000);
    const jwt = signJwt(
      { alg: "RS256", typ: "JWT" },
      {
        iss: this.credentials.clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      },
      this.credentials.privateKey,
      "RS256",
    );

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const data = (await res.json()) as { access_token: string; expires_in: number; error?: string };
    if (!res.ok) throw new Error(`FCM OAuth2 token exchange failed: ${data.error ?? res.statusText}`);

    this.cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return data.access_token;
  }

  async send(message: PushMessage): Promise<PushSendResult> {
    const token = await this.getAccessToken();
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${this.credentials.projectId}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token: message.deviceToken,
          notification: { title: message.title, body: message.body },
          data: message.data,
          android: message.sound || message.badge !== undefined ? { notification: { sound: message.sound } } : undefined,
          apns: message.badge !== undefined ? { payload: { aps: { badge: message.badge, sound: message.sound } } } : undefined,
        },
      }),
    });

    const data = (await res.json()) as { name?: string; error?: { status: string; message: string } };
    if (!res.ok) {
      if (data.error?.status === "NOT_FOUND" || data.error?.status === "INVALID_ARGUMENT") {
        throw Object.assign(new Error(data.error.message), {
          invalidToken: { deviceToken: message.deviceToken, reason: "unregistered" } satisfies PushInvalidTokenError,
        });
      }
      throw new Error(`FCM send failed: ${data.error?.message ?? res.statusText}`);
    }
    return { providerMessageId: data.name ?? `fcm_${Date.now()}` };
  }

  async sendBatch(messages: PushMessage[]): Promise<(PushSendResult | PushInvalidTokenError)[]> {
    // FCM's v1 API sends one message per request (batch sending was a v1
    // legacy-API-only feature Google deprecated) — fan out concurrently
    // rather than sequentially, and translate each per-message failure
    // into the PushInvalidTokenError shape DeliveryService needs to
    // deactivate stale tokens without failing the whole batch.
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
