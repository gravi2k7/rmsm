import type {
  Approval,
  ApiErrorBody,
  ListStrategiesParams,
  PaginatedStrategies,
  Publication,
  Strategy,
  StrategyCategory,
  StrategyCategoryMeta,
  StrategyParameterDefinition,
  StrategyVersion,
  ValidationResult,
} from "@/types/strategy";
import { toRuleGroupWire, type WireRuleGroup } from "./rule-tree-mapper";
import type { RuleGroupNode } from "@/types/strategy";

/** Same-origin `/api` reverse-proxied to `apps/api` in production; overridable
 * for local dev pointed at a differently-hosted API. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.details = body.details;
  }
}

export interface RequestContext {
  organizationId: string;
  accessToken: string;
}

async function request<T>(ctx: RequestContext, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/organizations/${ctx.organizationId}${path}`, {
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

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const strategyApi = {
  list(ctx: RequestContext, params: ListStrategiesParams = {}): Promise<PaginatedStrategies> {
    return request(ctx, `/strategies${toQueryString(params)}`);
  },

  get(ctx: RequestContext, strategyId: string): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}`);
  },

  categories(ctx: RequestContext): Promise<StrategyCategoryMeta[]> {
    return request(ctx, `/strategies/categories`);
  },

  tags(ctx: RequestContext): Promise<string[]> {
    return request(ctx, `/strategies/tags`);
  },

  create(ctx: RequestContext, input: { name: string; description: string; category: StrategyCategory }): Promise<Strategy> {
    return request(ctx, `/strategies`, { method: "POST", body: JSON.stringify(input) });
  },

  update(
    ctx: RequestContext,
    strategyId: string,
    input: { name?: string; description?: string; addTags?: string[]; removeTags?: string[] },
  ): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}`, { method: "PUT", body: JSON.stringify(input) });
  },

  archive(ctx: RequestContext, strategyId: string): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}`, { method: "DELETE" });
  },

  clone(ctx: RequestContext, strategyId: string, newName: string): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}/clone`, { method: "POST", body: JSON.stringify({ newName }) });
  },

  publishLatestApproved(ctx: RequestContext, strategyId: string): Promise<Publication> {
    return request(ctx, `/strategies/${strategyId}/publish`, { method: "POST" });
  },

  listVersions(ctx: RequestContext, strategyId: string): Promise<StrategyVersion[]> {
    return request(ctx, `/strategies/${strategyId}/versions`);
  },

  createVersion(
    ctx: RequestContext,
    strategyId: string,
    input: { entryRules: RuleGroupNode; exitRules: RuleGroupNode; parameters: StrategyParameterDefinition[] },
  ): Promise<StrategyVersion> {
    const body: { entryRules: WireRuleGroup; exitRules: WireRuleGroup; parameters: StrategyParameterDefinition[] } = {
      entryRules: toRuleGroupWire(input.entryRules),
      exitRules: toRuleGroupWire(input.exitRules),
      parameters: input.parameters,
    };
    return request(ctx, `/strategies/${strategyId}/versions`, { method: "POST", body: JSON.stringify(body) });
  },
};

export const versionApi = {
  get(ctx: RequestContext, versionId: string): Promise<StrategyVersion> {
    return request(ctx, `/strategy-versions/${versionId}`);
  },

  validate(ctx: RequestContext, versionId: string): Promise<ValidationResult> {
    return request(ctx, `/strategy-versions/${versionId}/validate`, { method: "POST" });
  },

  requestApproval(ctx: RequestContext, versionId: string): Promise<Approval> {
    return request(ctx, `/strategy-versions/${versionId}/request-approval`, { method: "POST" });
  },

  decide(ctx: RequestContext, versionId: string, decision: "APPROVED" | "REJECTED", comments?: string): Promise<Approval> {
    return request(ctx, `/strategy-versions/${versionId}/decide`, { method: "POST", body: JSON.stringify({ decision, comments }) });
  },

  publish(ctx: RequestContext, versionId: string): Promise<Publication> {
    return request(ctx, `/strategy-versions/${versionId}/publish`, { method: "POST" });
  },

  rollback(ctx: RequestContext, versionId: string): Promise<StrategyVersion> {
    return request(ctx, `/strategy-versions/${versionId}/rollback`, { method: "POST" });
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Phase 4C — Authentication. A second, global fetch client alongside the
// org-scoped one above: every *new* module (auth itself, and everything
// after it per the roadmap) authenticates implicitly via `useAuthStore`
// rather than threading an explicit `RequestContext` through every call,
// since those modules aren't inherently org-scoped the way the Strategy
// Engine's endpoints are. `strategyApi`/`versionApi` above are untouched;
// this doesn't replace them, it's the client for everything new.
// ─────────────────────────────────────────────────────────────────────────
import { useAuthStore } from "./auth-store";
import { useSessionStore } from "./session-store";

/** Only one refresh request in flight at a time — if several queries 401
 * simultaneously (a realistic scenario: the dashboard fires several
 * requests in parallel right as a token expires), they all await the
 * *same* refresh attempt instead of each independently hitting
 * `/auth/refresh` and racing to rotate the same refresh token. apps/api's
 * own `AuthService.refresh()` treats reuse of an already-rotated refresh
 * token as theft and revokes the whole session — a genuine, real reason
 * this dedup matters, not just an efficiency nicety. */
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens, markSessionExpired } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // The refresh token itself was rejected (expired, revoked, or
      // already rotated) — this is a real end of session, not a blip.
      markSessionExpired();
      return false;
    }
    const tokens = (await res.json()) as { accessToken: string; refreshToken: string; expiresIn: string };
    setTokens(tokens);
    // Bridges the new global auth session into the pre-existing
    // Strategy-Builder-only session store (`session-store.ts`), which was
    // built before real auth existed and still expects a manually-pasted
    // access token. Once a trader is genuinely logged in, the Strategy
    // Builder's own "Connect session" flow only needs an organization id
    // now — see session-store.ts's own comment for why organization id
    // still can't be resolved automatically (no self-service "my
    // organizations" endpoint exists yet, the same category of gap
    // Phase 4B's own PHASE_4B_SUMMARY.md documents for admin console).
    useSessionStore.getState().setAccessToken(tokens.accessToken);
    return true;
  } catch {
    // A network failure here is ambiguous (could be transient), but this
    // client has no separate "offline" state to fall back to, so it's
    // treated the same as a rejected refresh rather than silently
    // leaving the trader in a half-authenticated state.
    markSessionExpired();
    return false;
  }
}

export interface ApiFetchOptions {
  /** Skips attaching the Authorization header and skips the 401-refresh
   * flow — for the login/refresh/forgot-password/reset-password endpoints
   * themselves, which are never authenticated by definition. */
  skipAuth?: boolean;
}

async function parseGlobalErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    const body = await res.json();
    const error = body?.error as { message?: string; code?: string; details?: unknown } | undefined;
    return {
      statusCode: res.status,
      message: error?.message ?? body?.message ?? res.statusText ?? "Request failed",
      code: error?.code ?? body?.code,
      details: error?.details ?? body?.details,
    };
  } catch {
    return { statusCode: res.status, message: res.statusText ?? "Request failed" };
  }
}

/**
 * The one function every *new* (Phase 4C+) hook goes through. Successful
 * responses are **not** wrapped in the `ApiResponse<T>` envelope — only
 * error responses are (apps/api has no global success-wrapping
 * interceptor, only `GlobalExceptionFilter` for errors) — so this returns
 * the parsed body directly as `T` on success, and throws the same
 * `ApiError` class as the org-scoped client above on failure.
 */
export async function apiFetch<T>(path: string, init?: RequestInit, options?: ApiFetchOptions): Promise<T> {
  const doFetch = (): Promise<Response> => {
    const { accessToken } = useAuthStore.getState();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken && !options?.skipAuth) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  };

  let res = await doFetch();

  if (res.status === 401 && !options?.skipAuth) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    throw new ApiError(await parseGlobalErrorBody(res));
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string, options?: ApiFetchOptions) => apiFetch<T>(path, { method: "GET" }, options),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }, options),
  put: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }, options),
  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }, options),
  delete: <T>(path: string, options?: ApiFetchOptions) => apiFetch<T>(path, { method: "DELETE" }, options),
};
