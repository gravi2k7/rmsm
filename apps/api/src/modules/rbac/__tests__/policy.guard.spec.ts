import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { PolicyGuard } from "../guards/policy.guard";
import type { Policy } from "../interfaces/policy.interface";

function fakeContext(user: unknown, params: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function fakeReflector(policy: Policy | undefined): Reflector {
  return { getAllAndOverride: () => policy } as unknown as Reflector;
}

describe("PolicyGuard", () => {
  it("allows the request through when no policy is attached", async () => {
    const guard = new PolicyGuard(fakeReflector(undefined));
    const result = await guard.canActivate(fakeContext({ sub: "user-1", permissions: [] }));
    expect(result).toBe(true);
  });

  it("denies when there is no authenticated user, even with no policy attached", async () => {
    // Not a realistic combination in practice (JwtAuthGuard runs first),
    // but the guard itself should not assume `user` is always present.
    const guard = new PolicyGuard(fakeReflector({ name: "x", evaluate: () => true }));
    const result = await guard.canActivate(fakeContext(undefined));
    expect(result).toBe(false);
  });

  it("allows when the attached policy evaluates to true", async () => {
    const policy: Policy = { name: "always-true", evaluate: () => true };
    const guard = new PolicyGuard(fakeReflector(policy));
    const result = await guard.canActivate(fakeContext({ sub: "user-1", permissions: [] }));
    expect(result).toBe(true);
  });

  it("denies when the attached policy evaluates to false", async () => {
    const policy: Policy = { name: "always-false", evaluate: () => false };
    const guard = new PolicyGuard(fakeReflector(policy));
    const result = await guard.canActivate(fakeContext({ sub: "user-1", permissions: [] }));
    expect(result).toBe(false);
  });

  it("supports an async policy evaluator", async () => {
    const policy: Policy = { name: "async", evaluate: async () => true };
    const guard = new PolicyGuard(fakeReflector(policy));
    const result = await guard.canActivate(fakeContext({ sub: "user-1", permissions: [] }));
    expect(result).toBe(true);
  });

  it("passes routeParams through to the policy", async () => {
    let receivedParams: unknown;
    const policy: Policy = {
      name: "capture",
      evaluate: (ctx) => {
        receivedParams = ctx.routeParams;
        return true;
      },
    };
    const guard = new PolicyGuard(fakeReflector(policy));
    await guard.canActivate(fakeContext({ sub: "user-1", permissions: [] }, { id: "abc" }));
    expect(receivedParams).toEqual({ id: "abc" });
  });
});
