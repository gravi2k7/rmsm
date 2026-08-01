import { ConflictError } from "@rmsm/shared";
import type { OrganizationMembership, OrganizationRole, MembershipStatus } from "@rmsm/database";
import { OrganizationMembershipService } from "../membership.service";
import type { OrganizationMembershipRepository } from "../../repositories/membership.repository";
import type { OrganizationMembershipEventRepository } from "../../repositories/membership-event.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { OrganizationEventPublisher } from "../../events/organization-event-publisher.service";

/**
 * Unit-level coverage for the "exactly one active Owner" application-layer
 * guard (Decision 1) using hand-rolled repository/service mocks — no
 * database required. This is deliberately narrow: it tests the invariant
 * logic in isolation, not the full transactional flow (that needs a real
 * database and belongs in an e2e spec once this sandbox's Prisma blocker
 * is unblocked — see the Phase 3 doc's verification section).
 *
 * Phase 4 fix #1: this file originally used `as any` to satisfy the
 * constructor's parameter types — missed because it was added after Phase
 * 3's lint check had already run. Fixed with `jest.Mocked<Pick<T, ...>>`
 * mocks cast through `unknown`, not `any`.
 *
 * Phase 4 fix #2: switching away from `as any` immediately surfaced a
 * second, genuine gap — the mock OrganizationMembership fixtures below
 * were missing `invitedById`/`joinedAt`/`createdAt`/`updatedAt` and only
 * "worked" because `as any` had been silently discarding that check too.
 * Fixed with one complete `buildMembership()` factory instead of five
 * separate incomplete literals.
 */
describe("OrganizationMembershipService — last active Owner guard", () => {
  type MembershipRepoMock = jest.Mocked<
    Pick<OrganizationMembershipRepository, "findById" | "countActiveByRole" | "updateStatus" | "findByOrgAndUser">
  >;
  type MembershipEventRepoMock = jest.Mocked<Pick<OrganizationMembershipEventRepository, "create">>;
  type AuditServiceMock = jest.Mocked<Pick<AuditService, "log">>;
  type EventPublisherMock = jest.Mocked<Pick<OrganizationEventPublisher, "publish">>;

  function buildMembership(overrides: {
    id: string;
    organizationId: string;
    userId: string;
    role: OrganizationRole;
    status?: MembershipStatus;
  }): OrganizationMembership {
    const now = new Date();
    return {
      status: "ACTIVE",
      invitedById: null,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  function buildService(activeOwnerCount: number) {
    const membershipRepository: MembershipRepoMock = {
      findById: jest.fn(),
      countActiveByRole: jest.fn().mockResolvedValue(activeOwnerCount),
      updateStatus: jest.fn().mockResolvedValue({}),
      findByOrgAndUser: jest.fn(),
    };
    const membershipEventRepository: MembershipEventRepoMock = { create: jest.fn().mockResolvedValue({}) };
    const auditService: AuditServiceMock = { log: jest.fn().mockResolvedValue({}) };
    const eventPublisher: EventPublisherMock = { publish: jest.fn() };

    const service = new OrganizationMembershipService(
      membershipRepository as unknown as OrganizationMembershipRepository,
      membershipEventRepository as unknown as OrganizationMembershipEventRepository,
      auditService as unknown as AuditService,
      eventPublisher as unknown as OrganizationEventPublisher,
    );
    return { service, membershipRepository, membershipEventRepository, auditService, eventPublisher };
  }

  it("blocks removing the final active Owner", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findById.mockResolvedValue(
      buildMembership({ id: "m1", organizationId: "org1", userId: "u1", role: "OWNER" }),
    );

    await expect(service.removeMember("org1", "m1", "actor1")).rejects.toThrow(ConflictError);
    expect(membershipRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("allows removing an Owner when another active Owner exists", async () => {
    const { service, membershipRepository } = buildService(2);
    membershipRepository.findById.mockResolvedValue(
      buildMembership({ id: "m1", organizationId: "org1", userId: "u1", role: "OWNER" }),
    );

    await service.removeMember("org1", "m1", "actor1");
    expect(membershipRepository.updateStatus).toHaveBeenCalledWith("m1", "REMOVED");
  });

  it("allows removing a non-Owner member regardless of owner count", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findById.mockResolvedValue(
      buildMembership({ id: "m2", organizationId: "org1", userId: "u2", role: "ANALYST" }),
    );

    await service.removeMember("org1", "m2", "actor1");
    expect(membershipRepository.updateStatus).toHaveBeenCalledWith("m2", "REMOVED");
  });

  it("blocks the sole active Owner from leaving", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findByOrgAndUser.mockResolvedValue(
      buildMembership({ id: "m1", organizationId: "org1", userId: "u1", role: "OWNER" }),
    );

    await expect(service.leaveOrganization("org1", "u1")).rejects.toThrow(ConflictError);
  });

  it("rejects changeRole for any transition into or out of OWNER", async () => {
    const { service, membershipRepository } = buildService(1);
    membershipRepository.findById.mockResolvedValue(
      buildMembership({ id: "m1", organizationId: "org1", userId: "u1", role: "OWNER" }),
    );

    await expect(service.changeRole("org1", "m1", "ADMINISTRATOR", "actor1")).rejects.toThrow(ConflictError);
  });
});
