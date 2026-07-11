import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../guards/roles.guard";

function mockContext(user: unknown, handlerRoles?: string[]) {
  const reflector = new Reflector();
  jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(handlerRoles);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { reflector, context };
}

describe("RolesGuard", () => {
  it("allows access when no roles are required", () => {
    const { reflector, context } = mockContext({ roles: [] }, undefined);
    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it("denies access when user lacks any required role", () => {
    const { reflector, context } = mockContext({ roles: ["FREE_USER"] }, ["ADMIN", "SUPER_ADMIN"]);
    expect(new RolesGuard(reflector).canActivate(context)).toBe(false);
  });

  it("allows access when user has one of the required roles", () => {
    const { reflector, context } = mockContext({ roles: ["ADMIN"] }, ["ADMIN", "SUPER_ADMIN"]);
    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it("denies access when there is no user on the request", () => {
    const { reflector, context } = mockContext(undefined, ["ADMIN"]);
    expect(new RolesGuard(reflector).canActivate(context)).toBe(false);
  });
});
