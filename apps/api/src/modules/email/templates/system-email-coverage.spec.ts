import {
  passwordResetEmail,
  securityAlertEmail,
  verificationEmail,
  welcomeEmail,
} from "./auth.templates";
import {
  invitationRevokedEmail,
  organizationInvitationEmail,
} from "../../organizations/templates/organization-invitation.template";

describe("CYGNEX enterprise system email coverage", () => {
  const link = "https://cygnex.co/test-link";

  it("covers authentication emails", () => {
    const templates = [
      verificationEmail(link),
      passwordResetEmail(link),
      welcomeEmail(),
      securityAlertEmail("Account locked", "192.0.2.10"),
    ];

    for (const template of templates) {
      expect(template.subject).toBeTruthy();
      expect(template.html).toContain("<html");
      expect(template.html).toContain("Cygnex");
    }
  });

  it("covers organization emails", () => {
    const invitation = organizationInvitationEmail(
      link,
      "Cygnex Research",
      "ADMIN",
      {
        message: "Welcome to the organization.",
        expiresInDays: 7,
      },
    );

    const revoked = invitationRevokedEmail("Cygnex Research");

    for (const template of [invitation, revoked]) {
      expect(template.subject).toBeTruthy();
      expect(template.html).toContain("<html");
      expect(template.html).toContain("Cygnex");
    }
  });

  it("does not expose untrusted security-event HTML", () => {
    const template = securityAlertEmail(
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
    );

    expect(template.html).not.toContain("<script>");
    expect(template.html).not.toContain("<img");
  });
});
