import { ApiError, type RequestContext } from "@/lib/api-client";
import type { ApiErrorBody } from "@/types/strategy";
import type { Notification, NotificationStatus } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

async function notificationRequest<T>(ctx: RequestContext, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/notifications/organizations/${ctx.organizationId}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.accessToken}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = await res.json();
    } catch {
      body = { statusCode: res.status, message: res.statusText || "Request failed" };
    }
    throw new ApiError({ statusCode: res.status, message: body.message ?? "Request failed", code: body.code, details: body.details });
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const notificationApi = {
  list(ctx: RequestContext, params: { status?: NotificationStatus; take?: number; skip?: number } = {}): Promise<{ items: Notification[]; total: number }> {
    return notificationRequest(ctx, toQueryString(params));
  },
  get(ctx: RequestContext, id: string): Promise<Notification> {
    return notificationRequest(ctx, `/${id}`);
  },
  markRead(ctx: RequestContext, id: string): Promise<Notification> {
    return notificationRequest(ctx, `/${id}/read`, { method: "PATCH" });
  },
  archive(ctx: RequestContext, id: string): Promise<Notification> {
    return notificationRequest(ctx, `/${id}/archive`, { method: "PATCH" });
  },
  remove(ctx: RequestContext, id: string): Promise<void> {
    return notificationRequest(ctx, `/${id}`, { method: "DELETE" });
  },
};
