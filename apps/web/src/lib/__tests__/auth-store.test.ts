import { describe, expect, it, beforeEach } from "vitest";
import { useAuthStore } from "../auth-store";

const tokens = { accessToken: "access-1", refreshToken: "refresh-1", expiresIn: "15m" };
const user = { sub: "user-1", email: "trader@example.com", roles: ["TRADER"], permissions: ["strategies.read", "strategies.write"], sessionId: "session-1" };

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, rememberMe: true, sessionExpired: false });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("starts unauthenticated", () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("setSession() stores tokens and user together, and clears any prior sessionExpired flag", () => {
    useAuthStore.setState({ sessionExpired: true });
    useAuthStore.getState().setSession(tokens, user);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access-1");
    expect(state.refreshToken).toBe("refresh-1");
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated()).toBe(true);
    expect(state.sessionExpired).toBe(false);
  });

  it("setTokens() updates only the tokens, leaving user untouched", () => {
    useAuthStore.getState().setSession(tokens, user);
    useAuthStore.getState().setTokens({ accessToken: "access-2", refreshToken: "refresh-2", expiresIn: "15m" });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access-2");
    expect(state.user).toEqual(user);
  });

  it("clear() resets tokens and user but not rememberMe", () => {
    useAuthStore.getState().setRememberMe(false);
    useAuthStore.getState().setSession(tokens, user);
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
    expect(state.rememberMe).toBe(false);
  });

  it("hasPermission() checks the current user's own permission list", () => {
    useAuthStore.getState().setSession(tokens, user);
    expect(useAuthStore.getState().hasPermission("strategies.read")).toBe(true);
    expect(useAuthStore.getState().hasPermission("decisions.approve")).toBe(false);
  });

  it("hasPermission() is false with no user signed in", () => {
    expect(useAuthStore.getState().hasPermission("strategies.read")).toBe(false);
  });

  it("hasRole() checks the current user's own role list", () => {
    useAuthStore.getState().setSession(tokens, user);
    expect(useAuthStore.getState().hasRole("TRADER")).toBe(true);
    expect(useAuthStore.getState().hasRole("ADMIN")).toBe(false);
  });

  it("markSessionExpired() clears tokens and sets the flag", () => {
    useAuthStore.getState().setSession(tokens, user);
    useAuthStore.getState().markSessionExpired();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.sessionExpired).toBe(true);
    // The user's own claims are left in place — only the credentials are
    // invalidated — so the Session Expired dialog can still greet them by
    // name/email if desired.
    expect(state.user).toEqual(user);
  });

  it("clearSessionExpired() resets the flag without touching auth state", () => {
    useAuthStore.getState().setSession(tokens, user);
    useAuthStore.getState().markSessionExpired();
    useAuthStore.getState().clearSessionExpired();
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it("Remember Me true persists the session to localStorage, not sessionStorage", () => {
    useAuthStore.getState().setRememberMe(true);
    useAuthStore.getState().setSession(tokens, user);
    expect(window.localStorage.getItem("rmsm-web-auth")).toContain("access-1");
    expect(window.sessionStorage.getItem("rmsm-web-auth")).toBeNull();
  });

  it("Remember Me false persists the session to sessionStorage, not localStorage", () => {
    useAuthStore.getState().setRememberMe(false);
    useAuthStore.getState().setSession(tokens, user);
    expect(window.sessionStorage.getItem("rmsm-web-auth")).toContain("access-1");
    expect(window.localStorage.getItem("rmsm-web-auth")).toBeNull();
  });
});
