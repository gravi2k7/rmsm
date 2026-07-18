import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionStore } from "../../lib/session-store";
import { useRequestContext } from "../use-request-context";

describe("useRequestContext", () => {
  beforeEach(() => {
    act(() => {
      useSessionStore.getState().clear();
    });
  });

  it("returns null when neither org id nor token are set", () => {
    const { result } = renderHook(() => useRequestContext());
    expect(result.current).toBeNull();
  });

  it("returns null when only one of org id / token is set", () => {
    act(() => useSessionStore.getState().setOrganizationId("org-1"));
    const { result } = renderHook(() => useRequestContext());
    expect(result.current).toBeNull();
  });

  it("returns a populated context once both org id and token are set", () => {
    act(() => {
      useSessionStore.getState().setOrganizationId("org-1");
      useSessionStore.getState().setAccessToken("token-abc");
    });
    const { result } = renderHook(() => useRequestContext());
    expect(result.current).toEqual({ organizationId: "org-1", accessToken: "token-abc" });
  });

  it("clear() resets both fields back to null", () => {
    act(() => {
      useSessionStore.getState().setOrganizationId("org-1");
      useSessionStore.getState().setAccessToken("token-abc");
      useSessionStore.getState().clear();
    });
    const { result } = renderHook(() => useRequestContext());
    expect(result.current).toBeNull();
  });
});
