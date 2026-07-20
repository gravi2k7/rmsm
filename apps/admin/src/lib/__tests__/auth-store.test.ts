import { describe, expect, it, beforeEach } from "vitest";
import { useAuthStore } from "../auth-store";

const tokens = { accessToken: "access-1", refreshToken: "refresh-1", expiresIn: "15m" };
const user = { sub: "user-1", email: "admin@example.com", roles: ["ADMIN"], permissions: ["strategies.read", "strategies.write"], sessionId: "session-1" };

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  });

  it("starts unauthenticated", () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("setSession() stores tokens and user together", () => {
    useAuthStore.getState().setSession(tokens, user);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access-1");
    expect(state.refreshToken).toBe("refresh-1");
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated()).toBe(true);
  });

  it("setTokens() updates only the tokens, leaving user untouched", () => {
    useAuthStore.getState().setSession(tokens, user);
    useAuthStore.getState().setTokens({ accessToken: "access-2", refreshToken: "refresh-2", expiresIn: "15m" });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access-2");
    expect(state.user).toEqual(user);
  });

  it("clear() resets everything", () => {
    useAuthStore.getState().setSession(tokens, user);
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it("hasPermission() checks the current user's own permission list", () => {
    useAuthStore.getState().setSession(tokens, user);
    expect(useAuthStore.getState().hasPermission("strategies.read")).toBe(true);
    expect(useAuthStore.getState().hasPermission("decisions.approve")).toBe(false);
  });

  it("hasPermission() is false with no user signed in", () => {
    expect(useAuthStore.getState().hasPermission("strategies.read")).toBe(false);
  });
});
