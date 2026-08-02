import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useOrgFanout } from "../use-org-fanout";
import type { Organization } from "@/features/organizations/types";

const orgs: Organization[] = [
  { id: "org-1", name: "Accessible Co", slug: "accessible-co", timezone: "UTC", currency: "USD", status: "ACTIVE", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "org-2", name: "Restricted Co", slug: "restricted-co", timezone: "UTC", currency: "USD", status: "ACTIVE", createdAt: "2026-01-01T00:00:00.000Z" },
];

describe("useOrgFanout", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches one request per organization and marks a 403 as restricted, not a generic error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("org-1")) {
          return new Response(JSON.stringify({ id: "sub-1", status: "ACTIVE" }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: { message: "Forbidden", statusCode: 403 } }), { status: 403 });
      }),
    );

    const { result } = renderHook(() => useOrgFanout<{ id: string; status: string }>(orgs, (id) => `/billing/organizations/${id}/subscription`, "test-fanout"), {
      wrapper: withQueryClient(),
    });

    await waitFor(() => expect(result.current.every((r) => !r.isLoading)).toBe(true));

    const [accessible, restricted] = result.current;
    expect(accessible!.data).toEqual({ id: "sub-1", status: "ACTIVE" });
    expect(accessible!.restricted).toBe(false);
    expect(restricted!.restricted).toBe(true);
    expect(restricted!.data).toBeUndefined();
    expect(restricted!.error).toBeUndefined();
  });

  it("returns an empty array when there are no organizations to fan out over", () => {
    const { result } = renderHook(() => useOrgFanout(undefined, (id) => `/billing/organizations/${id}/subscription`, "test-fanout-empty"), {
      wrapper: withQueryClient(),
    });
    expect(result.current).toEqual([]);
  });
});
