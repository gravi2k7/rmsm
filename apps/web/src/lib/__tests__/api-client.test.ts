import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, strategyApi } from "../api-client";

const ctx = { organizationId: "org-1", accessToken: "token-abc" };

describe("strategyApi.list", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the correct URL with org id, path, and query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await strategyApi.list(ctx, { status: "ACTIVE", page: 2, pageSize: 10 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/organizations/org-1/strategies?status=ACTIVE&page=2&pageSize=10");
    expect(init.headers.Authorization).toBe("Bearer token-abc");
  });

  it("omits undefined/empty query params entirely", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await strategyApi.list(ctx, { searchText: "" });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/organizations/org-1/strategies");
  });

  it("throws ApiError with the backend's own status/message/code on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ statusCode: 404, code: "STRATEGY_NOT_FOUND", message: "Strategy not found." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(strategyApi.get(ctx, "missing-id")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 404,
      code: "STRATEGY_NOT_FOUND",
      message: "Strategy not found.",
    });
  });

  it("falls back to statusText when the error body isn't valid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await strategyApi.get(ctx, "x").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Internal Server Error");
  });
});
