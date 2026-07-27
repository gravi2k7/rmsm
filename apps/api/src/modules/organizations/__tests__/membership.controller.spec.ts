// MembershipController statically imports OrganizationMembershipService and
// OrganizationInvitationService (for Nest's design:paramtypes decorator
// metadata), which transitively import the real `prisma` singleton — same
// reason auth.controller specs mock @rmsm/database (see
// auth.controller.email-recovery.spec.ts).
jest.mock("@rmsm/database", () => ({ prisma: {} }));

import { MembershipController } from "../membership.controller";
import type { OrganizationMembershipService } from "../services/membership.service";
import type { OrganizationInvitationService } from "../services/invitation.service";

describe("MembershipController (WM-020E)", () => {
  function buildController(overrides: {
    membershipService?: Partial<OrganizationMembershipService>;
    invitationService?: Partial<OrganizationInvitationService>;
  } = {}) {
    const membershipService = (overrides.membershipService ?? {}) as OrganizationMembershipService;
    const invitationService = (overrides.invitationService ?? {}) as OrganizationInvitationService;
    return new MembershipController(membershipService, invitationService);
  }

  const user = { sub: "user-1" } as never;
  const req = { headers: {} } as never;

  it("inviteMember forwards email, role, message, and expiresInDays to OrganizationInvitationService.createInvitation", async () => {
    const createInvitation = jest.fn().mockResolvedValue({ message: "Invitation sent." });
    const controller = buildController({ invitationService: { createInvitation } });

    const result = await controller.inviteMember(
      "org-1",
      { email: "invitee@example.com", role: "TRADER", message: "Welcome!", expiresInDays: 10 },
      user,
      req,
    );

    expect(createInvitation).toHaveBeenCalledWith(
      "org-1",
      "invitee@example.com",
      "TRADER",
      "user-1",
      expect.any(Object),
      { message: "Welcome!", expiresInDays: 10 },
    );
    expect(result).toEqual({ message: "Invitation sent." });
  });

  it("acceptInvitation forwards the token and the authenticated user's id", async () => {
    const acceptInvitation = jest.fn().mockResolvedValue({ id: "mem-1" });
    const controller = buildController({ invitationService: { acceptInvitation } });

    const result = await controller.acceptInvitation({ token: "raw-token" }, user, req);

    expect(acceptInvitation).toHaveBeenCalledWith("raw-token", "user-1", expect.any(Object));
    expect(result).toEqual({ id: "mem-1" });
  });

  it("declineInvitation forwards only the token — no account/auth required", async () => {
    const rejectInvitation = jest.fn().mockResolvedValue({ message: "Invitation declined." });
    const controller = buildController({ invitationService: { rejectInvitation } });

    const result = await controller.declineInvitation({ token: "raw-token" });

    expect(rejectInvitation).toHaveBeenCalledWith("raw-token");
    expect(result).toEqual({ message: "Invitation declined." });
  });

  it("cancelInvitation forwards organizationId, invitationId, and actor", async () => {
    const cancelInvitation = jest.fn().mockResolvedValue({ message: "Invitation cancelled." });
    const controller = buildController({ invitationService: { cancelInvitation } });

    const result = await controller.cancelInvitation("org-1", "inv-1", user, req);

    expect(cancelInvitation).toHaveBeenCalledWith("org-1", "inv-1", "user-1", expect.any(Object));
    expect(result).toEqual({ message: "Invitation cancelled." });
  });

  it("propagates invitation-service errors unchanged (e.g. duplicate invitation) for the global exception filter", async () => {
    const createInvitation = jest.fn().mockRejectedValue(new Error("invitee@example.com already has a pending invitation to this organization."));
    const controller = buildController({ invitationService: { createInvitation } });

    await expect(
      controller.inviteMember("org-1", { email: "invitee@example.com", role: "TRADER" }, user, req),
    ).rejects.toThrow("already has a pending invitation");
  });
});
