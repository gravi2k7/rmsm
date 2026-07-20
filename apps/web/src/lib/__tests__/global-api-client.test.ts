import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "../auth-store";
import { useSessionStore } from "../session-store";
import { api, ApiError } from "../api-client";

describe("global api client (Phase 4C auth)", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "initial-token", refreshToken: "refresh-token", user: null, sessionExpired: false });
    useSessionStore.getState().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns the parsed body directly on success (no envelope unwrapping)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "abc", email: "a@b.com" }), { status: 200, headers: { "Content-Type": "application/json" } })),
    );
    const result = await api.get<{ id: string; email: string }>("/auth/me");
    expect(result).toEqual({ id: "abc", email: "a@b.com" });
  });

  it("attaches the Authorization header from the auth store", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api.get("/sessions");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer initial-token");
  });

  it("throws ApiError parsed from the error envelope on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () => new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid credentials." } }), { status: 401 }),
      ),
    );

    let caught: unknown;
    try {
      await api.post("/auth/login", { email: "a@b.com", password: "wrong" }, { skipAuth: true });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).message).toBe("Invalid credentials.");
    expect((caught as ApiError).statusCode).toBe(401);
    expect((caught as ApiError).code).toBe("UNAUTHORIZED");
  });

  it("on a 401, attempts a refresh and retries the original request once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "new-token", refreshToken: "new-refresh", expiresIn: "15m" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.get<{ ok: boolean }>("/sessions");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe("new-token");
  });

  it("bridges a refreshed access token into the legacy Strategy Builder session store", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "new-token", refreshToken: "new-refresh", expiresIn: "15m" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/sessions");

    expect(useSessionStore.getState().accessToken).toBe("new-token");
  });

  it("marks the session expired (rather than only clearing tokens) when refresh itself fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get("/sessions")).rejects.toThrow();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.sessionExpired).toBe(true);
  });

  it("does not attach a token or attempt refresh when skipAuth is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api.post("/auth/login", { email: "a@b.com", password: "x" }, { skipAuth: true });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
