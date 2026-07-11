import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../guards/permissions.guard";

function mockContext(user: unknown, required?: string[]) {
  const reflector = new Reflector();
  jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(required);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { reflector, context };
}

describe("PermissionsGuard", () => {
  it("requires ALL listed permissions, not just one", () => {
    const { reflector, context } = mockContext(
      { permissions: ["users.read"] },
      ["users.read", "users.write"],
    );
    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(false);
  });

  it("allows access when the user has every required permission", () => {
    const { reflector, context } = mockContext(
      { permissions: ["users.read", "users.write"] },
      ["users.read", "users.write"],
    );
    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });
});
