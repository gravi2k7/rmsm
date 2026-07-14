import type { PushProviderType, DevicePlatform } from "@rmsm/database";

export interface PushMessage {
  deviceToken: string;
  platform: DevicePlatform;
  title: string;
  body: string;
  data?: Record<string, string>;
  /// APNs/FCM both support a badge count and a sound name — kept optional
  /// and platform-agnostic; the adapter implementation maps these onto
  /// each provider's actual payload shape.
  badge?: number;
  sound?: string;
}

export interface PushSendResult {
  providerMessageId: string;
}

/** A push send can fail per-device (e.g. an expired/unregistered token) without the whole batch failing — DeliveryService (Phase 2) uses this to deactivate stale DeviceToken rows rather than retrying them forever. */
export interface PushInvalidTokenError {
  deviceToken: string;
  reason: "unregistered" | "invalid" | "expired";
}

export abstract class PushProviderAdapter {
  abstract readonly type: PushProviderType;
  abstract readonly enabled: boolean;

  abstract send(message: PushMessage): Promise<PushSendResult>;

  abstract sendBatch(messages: PushMessage[]): Promise<(PushSendResult | PushInvalidTokenError)[]>;
}
