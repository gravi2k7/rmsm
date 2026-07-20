import { useAuthStore } from "./auth-store";
import type { AuthTokens } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export interface ApiErrorBody {
  message: string;
  code?: string;
  statusCode: number;
  details?: unknown;
}

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

/** Only one refresh request in flight at a time — if several queries
 * 401 simultaneously (a realistic scenario: a dashboard fires several
 * requests in parallel right as a token expires), they all await the
 * *same* refresh attempt instead of each independently hitting
 * `/auth/refresh` and racing to rotate the same refresh token. apps/api's
 * own `AuthService.refresh()` treats reuse of an already-rotated refresh
 * token as theft and revokes the whole session — a genuine, real reason
 * this dedup matters, not just an efficiency nicety. */
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clear();
      return false;
    }
    const tokens: AuthTokens = await res.json();
    setTokens(tokens);
    return true;
  } catch {
    clear();
    return false;
  }
}

export interface ApiFetchOptions {
  /** Skips attaching the Authorization header and skips the 401-refresh
   * flow — for the login/refresh endpoints themselves, which are never
   * authenticated by definition. */
  skipAuth?: boolean;
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    const body = await res.json();
    const error = body?.error as { message?: string; code?: string; details?: unknown } | undefined;
    return {
      message: error?.message ?? res.statusText ?? "Request failed",
      code: error?.code,
      statusCode: res.status,
      details: error?.details,
    };
  } catch {
    return { message: res.statusText ?? "Request failed", statusCode: res.status };
  }
}

/**
 * The one function every hook in this app goes through. Successful
 * responses are **not** wrapped in the `ApiResponse<T>` envelope — only
 * error responses are (apps/api has no global success-wrapping
 * interceptor, only `GlobalExceptionFilter` for errors) — so this
 * returns the parsed body directly as `T` on success, and throws
 * `ApiError` (parsed from the envelope) on failure.
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
    throw new ApiError(await parseErrorBody(res));
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
