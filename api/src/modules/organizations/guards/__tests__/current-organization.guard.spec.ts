import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError, ValidationError } from "@rmsm/shared";
import type { OrganizationMembership } from "@rmsm/database";
import { CurrentOrganizationGuard } from "../current-organization.guard";
import type { OrganizationMembershipRepository } from "../../repositories/membership.repository";

function mockContext(headers: Record<string, unknown>, user: unknown, handlerRoles?: string[]) {
  const reflector = new Reflector();
  jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(handlerRoles);
  const request: Record<string, unknown> = { headers, user };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { reflector, context, request };
}

function buildMembership(overrides: Partial<OrganizationMembership> = {}): OrganizationMembership {
  const now = new Date();
  return {
    id: "mem-1",
    organizationId: "org-1",
    userId: "user-1",
    role: "ADMINISTRATOR",
    status: "ACTIVE",
    invitedById: null,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as OrganizationMembership;
}

describe("CurrentOrganizationGuard", () => {
  function buildGuard(findByOrgAndUser: jest.Mock) {
    const membershipRepository = { findByOrgAndUser } as unknown as OrganizationMembershipRepository;
    return membershipRepository;
  }

  it("throws ValidationError when the X-Organization-Id header is missing", async () => {
    const { reflector, context } = mockContext({}, { sub: "user-1" });
    const guard = new CurrentOrganizationGuard(reflector, buildGuard(jest.fn()));

    await expect(guard.canActivate(context)).rejects.toThrow(ValidationError);
  });

  it("returns false when there is no authenticated user on the request", async () => {
    const { reflector, context } = mockContext({ "x-organization-id": "org-1" }, undefined);
    const guard = new CurrentOrganizationGuard(reflector, buildGuard(jest.fn()));

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it("throws ForbiddenError when the caller has no active membership in the header's organization", async () => {
    const findByOrgAndUser = jest.fn().mockResolvedValue(null);
    const { reflector, context } = mockContext({ "x-organization-id": "org-1" }, { sub: "user-1" });
    const guard = new CurrentOrganizationGuard(reflector, buildGuard(findByOrgAndUser));

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenError);
    expect(findByOrgAndUser).toHaveBeenCalledWith("org-1", "user-1");
  });

  it("throws ForbiddenError when the membership's role is not in the required set", async () => {
    const findByOrgAndUser = jest.fn().mockResolvedValue(buildMembership({ role: "VIEWER" }));
    const { reflector, context } = mockContext({ "x-organization-id": "org-1" }, { sub: "user-1" }, [
      "OWNER",
      "ADMINISTRATOR",
    ]);
    const guard = new CurrentOrganizationGuard(reflector, buildGuard(findByOrgAndUser));

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenError);
  });

  it("allows access and attaches currentOrganizationId + orgMembership to the request on success", async () => {
    const membership = buildMembership({ role: "OWNER" });
    const findByOrgAndUser = jest.fn().mockResolvedValue(membership);
    const { reflector, context, request } = mockContext({ "x-organization-id": "org-1" }, { sub: "user-1" }, [
      "OWNER",
    ]);
    const guard = new CurrentOrganizationGuard(reflector, buildGuard(findByOrgAndUser));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.currentOrganizationId).toBe("org-1");
    expect(request.orgMembership).toBe(membership);
  });

  it("allows access when no roles are required at all (only membership is checked)", async () => {
    const membership = buildMembership({ role: "VIEWER" });
    const findByOrgAndUser = jest.fn().mockResolvedValue(membership);
    const { reflector, context } = mockContext({ "x-organization-id": "org-1" }, { sub: "user-1" }, undefined);
    const guard = new CurrentOrganizationGuard(reflector, buildGuard(findByOrgAndUser));

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
