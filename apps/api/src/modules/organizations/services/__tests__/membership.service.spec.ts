import { ConflictError } from "@rmsm/shared";
import { OrganizationMembershipService } from "../membership.service";

/**
 * Unit-level coverage for the "exactly one active Owner" application-layer
 * guard (Decision 1) using hand-rolled repository/service mocks — no
 * database required. This is deliberately narrow: it tests the invariant
 * logic in isolation, not the full transactional flow (that needs a real
 * database and belongs in an e2e spec once this sandbox's Prisma blocker
 * is unblocked — see the Phase 3 doc's verification section).
 */
describe("OrganizationMembershipService — last active Owner guard", () => {
  function buildService(activeOwnerCount: number) {
    const membershipRepository = {
      findById: jest.fn(),
      countActiveByRole: jest.fn().mockResolvedValue(activeOwnerCount),
      updateStatus: jest.fn().mockResolvedValue({}),
      findByOrgAndUser: jest.fn(),
    };
    const membershipEventRepository = { create: jest.fn().mockResolvedValue({}) };
    const auditService = { log: jest.fn().mockResolvedValue({}) };

    const service = new OrganizationMembershipService(
      membershipRepository as unknown,
      membershipEventRepository as jest.Mocked<T>,
      auditService as Partial<T>,
    );
    return { service, membershipRepository, membershipEventRepository, auditService };
  }

  it("blocks removing the final active Owner", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findById.mockResolvedValue({
      id: "m1",
      organizationId: "org1",
      userId: "u1",
      role: "OWNER",
      status: "ACTIVE",
    });

    await expect(service.removeMember("org1", "m1", "actor1")).rejects.toThrow(ConflictError);
    expect(membershipRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("allows removing an Owner when another active Owner exists", async () => {
    const { service, membershipRepository } = buildService(2);
    membershipRepository.findById.mockResolvedValue({
      id: "m1",
      organizationId: "org1",
      userId: "u1",
      role: "OWNER",
      status: "ACTIVE",
    });

    await service.removeMember("org1", "m1", "actor1");
    expect(membershipRepository.updateStatus).toHaveBeenCalledWith("m1", "REMOVED");
  });

  it("allows removing a non-Owner member regardless of owner count", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findById.mockResolvedValue({
      id: "m2",
      organizationId: "org1",
      userId: "u2",
      role: "ANALYST",
      status: "ACTIVE",
    });

    await service.removeMember("org1", "m2", "actor1");
    expect(membershipRepository.updateStatus).toHaveBeenCalledWith("m2", "REMOVED");
  });

  it("blocks the sole active Owner from leaving", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findByOrgAndUser.mockResolvedValue({
      id: "m1",
      organizationId: "org1",
      userId: "u1",
      role: "OWNER",
      status: "ACTIVE",
    });

    await expect(service.leaveOrganization("org1", "u1")).rejects.toThrow(ConflictError);
  });

  it("rejects changeRole for any transition into or out of OWNER", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findById.mockResolvedValue({
      id: "m1",
      organizationId: "org1",
      userId: "u1",
      role: "OWNER",
      status: "ACTIVE",
    });

    await expect(service.changeRole("org1", "m1", "ADMINISTRATOR", "actor1")).rejects.toThrow(ConflictError);
  });
});
