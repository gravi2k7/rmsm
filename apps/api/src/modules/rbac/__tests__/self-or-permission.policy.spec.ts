import { createSelfOrPermissionPolicy } from "../policies/self-or-permission.policy";
import type { AccessTokenPayload } from "../../auth/services/token.service";

function user(sub: string, permissions: string[] = []): AccessTokenPayload {
  return { sub, email: "x@y.com", roles: [], permissions, sessionId: "s1" };
}

describe("createSelfOrPermissionPolicy", () => {
  it("allows when the route param matches the acting user's own id", () => {
    const policy = createSelfOrPermissionPolicy("userId", "users.write");
    const allowed = policy.evaluate({ user: user("user-1"), routeParams: { userId: "user-1" } });
    expect(allowed).toBe(true);
  });

  it("denies when acting on someone else's resource without the override permission", () => {
    const policy = createSelfOrPermissionPolicy("userId", "users.write");
    const allowed = policy.evaluate({ user: user("user-1"), routeParams: { userId: "user-2" } });
    expect(allowed).toBe(false);
  });

  it("allows acting on someone else's resource when holding the override permission", () => {
    const policy = createSelfOrPermissionPolicy("userId", "users.write");
    const allowed = policy.evaluate({ user: user("user-1", ["users.write"]), routeParams: { userId: "user-2" } });
    expect(allowed).toBe(true);
  });

  it("denies when the route param is missing and the permission is absent", () => {
    const policy = createSelfOrPermissionPolicy("userId", "users.write");
    const allowed = policy.evaluate({ user: user("user-1"), routeParams: {} });
    expect(allowed).toBe(false);
  });

  it("has a stable, descriptive name including the override permission", () => {
    const policy = createSelfOrPermissionPolicy("userId", "users.write");
    expect(policy.name).toBe("self-or-permission:users.write");
  });
});
