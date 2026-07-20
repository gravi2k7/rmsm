import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "../auth-store";
import { api, ApiError } from "../api-client";

describe("api-client", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "initial-token", refreshToken: "refresh-token", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns the parsed body directly on success (no envelope unwrapping)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "abc", name: "Test" }), { status: 200, headers: { "Content-Type": "application/json" } })),
    );
    const result = await api.get<{ id: string; name: string }>("/strategies/abc");
    expect(result).toEqual({ id: "abc", name: "Test" });
  });

  it("attaches the Authorization header from the auth store", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api.get("/strategies");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer initial-token");
  });

  it("throws ApiError parsed from the error envelope on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ success: false, data: null, error: { code: "NOT_FOUND", message: "Strategy not found." } }), { status: 404 }),
      ),
    );

    let caught: unknown;
    try {
      await api.get("/strategies/missing");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).message).toBe("Strategy not found.");
    expect((caught as ApiError).statusCode).toBe(404);
    expect((caught as ApiError).code).toBe("NOT_FOUND");
  });

  it("on a 401, attempts a refresh and retries the original request once", async () => {
    const fetchMock = vi
      .fn()
      // Original request -> 401
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      // Refresh request -> new tokens
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "new-token", refreshToken: "new-refresh", expiresIn: "15m" }), { status: 200 }))
      // Retried original request -> success
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.get<{ ok: boolean }>("/strategies");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe("new-token");
  });

  it("clears the session when refresh itself fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get("/strategies")).rejects.toThrow();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("does not attach a token or attempt refresh when skipAuth is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api.post("/auth/login", { email: "a@b.com", password: "x" }, { skipAuth: true });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
