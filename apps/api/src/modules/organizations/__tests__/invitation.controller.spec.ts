jest.mock("@rmsm/database", () => ({ prisma: {} }));

import { InvitationController } from "../invitation.controller";
import type { OrganizationInvitationService } from "../services/invitation.service";

describe("InvitationController (WM-020E)", () => {
  function buildController(overrides: Partial<OrganizationInvitationService> = {}) {
    return new InvitationController(overrides as OrganizationInvitationService);
  }

  const user = { sub: "user-1" } as never;
  const req = { headers: {} } as never;

  it("validateInvitation (public) forwards the token and returns the preview without requiring auth", async () => {
    const validateToken = jest.fn().mockResolvedValue({ valid: true, organizationName: "Acme", role: "TRADER", email: "a@b.com" });
    const controller = buildController({ validateToken });

    const result = await controller.validateInvitation("raw-token");

    expect(validateToken).toHaveBeenCalledWith("raw-token");
    expect(result).toEqual({ valid: true, organizationName: "Acme", role: "TRADER", email: "a@b.com" });
  });

  it("validateInvitation never throws for an invalid token — resolves valid:false instead (no email enumeration)", async () => {
    const validateToken = jest.fn().mockResolvedValue({ valid: false });
    const controller = buildController({ validateToken });

    await expect(controller.validateInvitation("bad-token")).resolves.toEqual({ valid: false });
  });

  it("listInvitations forwards the organizationId", async () => {
    const listPendingForOrganization = jest.fn().mockResolvedValue([{ id: "inv-1" }]);
    const controller = buildController({ listPendingForOrganization });

    const result = await controller.listInvitations("org-1");

    expect(listPendingForOrganization).toHaveBeenCalledWith("org-1");
    expect(result).toEqual([{ id: "inv-1" }]);
  });

  it("resendInvitation (expired-invitation resend) forwards organizationId, invitationId, and actor", async () => {
    const resendInvitation = jest.fn().mockResolvedValue({ message: "Invitation resent." });
    const controller = buildController({ resendInvitation });

    const result = await controller.resendInvitation("org-1", "inv-1", user, req);

    expect(resendInvitation).toHaveBeenCalledWith("org-1", "inv-1", "user-1", expect.any(Object));
    expect(result).toEqual({ message: "Invitation resent." });
  });

  it("expireInvitation forwards organizationId, invitationId, and actor", async () => {
    const expireInvitation = jest.fn().mockResolvedValue({ id: "inv-1", status: "EXPIRED" });
    const controller = buildController({ expireInvitation });

    const result = await controller.expireInvitation("org-1", "inv-1", user, req);

    expect(expireInvitation).toHaveBeenCalledWith("org-1", "inv-1", "user-1", expect.any(Object));
    expect(result).toEqual({ id: "inv-1", status: "EXPIRED" });
  });
});
