import { act, renderHook } from "@testing-library/react";
import { useAuthStore } from "../../lib/auth-store";
import { useOrganizationStore } from "../../lib/organization-store";
import { useRequestContext } from "../use-request-context";

describe("useRequestContext", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clear();
      useOrganizationStore.getState().setActiveOrganization(null);
      useOrganizationStore.getState().setAvailableOrganizations([]);
    });
  });

  it("returns null without an access token", () => {
    act(() => {
      useOrganizationStore.getState().setActiveOrganization({
        id: "org-1",
        name: "Organization 1",
        slug: "organization-1",
      });
    });

    const { result } = renderHook(() => useRequestContext());

    expect(result.current).toBeNull();
  });

  it("returns null without an active organization", () => {
    act(() => {
      useAuthStore.getState().setTokens({
        accessToken: "token-abc",
        refreshToken: "refresh-abc",
        expiresIn: "3600",
      });
    });

    const { result } = renderHook(() => useRequestContext());

    expect(result.current).toBeNull();
  });

  it("returns the authenticated organization request context", () => {
    act(() => {
      useAuthStore.getState().setTokens({
        accessToken: "token-abc",
        refreshToken: "refresh-abc",
        expiresIn: "3600",
      });

      useOrganizationStore.getState().setActiveOrganization({
        id: "org-1",
        name: "Organization 1",
        slug: "organization-1",
      });
    });

    const { result } = renderHook(() => useRequestContext());

    expect(result.current).toEqual({
      organizationId: "org-1",
      accessToken: "token-abc",
    });
  });

  it("ignores the legacy session store", () => {
    act(() => {
      useAuthStore.getState().setTokens({
        accessToken: "auth-token",
        refreshToken: "refresh-abc",
        expiresIn: "3600",
      });

      useOrganizationStore.getState().setActiveOrganization({
        id: "real-org",
        name: "Real Organization",
        slug: "real-organization",
      });
    });

    const { result } = renderHook(() => useRequestContext());

    expect(result.current).toEqual({
      organizationId: "real-org",
      accessToken: "auth-token",
    });
  });
});
