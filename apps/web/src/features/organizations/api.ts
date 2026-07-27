import { ApiError, api, type RequestContext } from "@/lib/api-client";
import type { ApiErrorBody } from "@/types/strategy";
import type { InvitableOrgRole, OrganizationInvitation, OrganizationMembership, ValidateInvitationResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

/** Org-scoped requests (`/organizations/:organizationId/...`) — same
 * shape as api-client.ts's own internal `request()` helper (used by
 * strategyApi/versionApi) and features/notifications/api.ts's
 * notificationRequest(); not reused directly only because neither is
 * exported outside its own file. */
async function orgRequest<T>(ctx: RequestContext, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/organizations/${ctx.organizationId}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.accessToken}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // apps/api wraps error responses in `{ error: { message, code, details } }`
    // (GlobalExceptionFilter) — same shape api-client.ts's own
    // parseGlobalErrorBody() unwraps for the global `api.*` helpers.
    let parsed: { message?: string; code?: string; details?: unknown; error?: { message?: string; code?: string; details?: unknown } };
    try {
      parsed = await res.json();
    } catch {
      parsed = {};
    }
    const body: ApiErrorBody = {
      statusCode: res.status,
      message: parsed.error?.message ?? parsed.message ?? res.statusText ?? "Request failed",
      code: parsed.error?.code ?? parsed.code,
      details: parsed.error?.details ?? parsed.details,
    };
    throw new ApiError(body);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export interface InviteMemberInput {
  email: string;
  role: InvitableOrgRole;
  message?: string;
  expiresInDays?: number;
}

export const invitationApi = {
  // ── Organization-scoped (Owner/Admin/Manager only, enforced server-side) ──
  list(ctx: RequestContext): Promise<OrganizationInvitation[]> {
    return orgRequest(ctx, "/invitations");
  },
  invite(ctx: RequestContext, input: InviteMemberInput): Promise<{ message: string }> {
    return orgRequest(ctx, "/members/invite", { method: "POST", body: JSON.stringify(input) });
  },
  cancel(ctx: RequestContext, invitationId: string): Promise<{ message: string }> {
    return orgRequest(ctx, `/invitations/${invitationId}/cancel`, { method: "POST" });
  },
  resend(ctx: RequestContext, invitationId: string): Promise<{ message: string }> {
    return orgRequest(ctx, `/invitations/${invitationId}/resend`, { method: "POST" });
  },

  // ── Token-based, not organization-scoped — these use the global `api`
  // helper (bearer token from the platform auth-store, or none at all
  // for the two @Public() endpoints) since there's no organizationId to
  // put in the URL yet at this point in the flow. ──
  validate(token: string): Promise<ValidateInvitationResult> {
    return api.get<ValidateInvitationResult>(`/organizations/invitations/validate?token=${encodeURIComponent(token)}`, { skipAuth: true });
  },
  accept(token: string): Promise<OrganizationMembership> {
    return api.post<OrganizationMembership>("/organizations/invitations/accept", { token });
  },
  decline(token: string): Promise<{ message: string }> {
    return api.post<{ message: string }>("/organizations/invitations/decline", { token }, { skipAuth: true });
  },
};
