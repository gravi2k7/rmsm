import {
  invitationRevokedEmail,
  organizationInvitationEmail,
} from "./organization-invitation.template";

describe("organization email templates", () => {
  it("renders organization invitation using the Cygnex enterprise layout", () => {
    const result = organizationInvitationEmail(
      "https://cygnex.co/invitations/accept?token=test-token",
      "Acme Capital",
      "ADMIN",
      {
        message: "Welcome to the team.",
        expiresInDays: 7,
      },
    );

    expect(result.subject).toBe(
      "You've been invited to join Acme Capital on RMSM AI",
    );

    expect(result.html).toContain("Organization invitation");
    expect(result.html).toContain("You're invited");
    expect(result.html).toContain("Acme Capital");
    expect(result.html).toContain("ADMIN");
    expect(result.html).toContain("Welcome to the team.");
    expect(result.html).toContain("Accept invitation");
    expect(result.html).toContain("cygnex.co");
    expect(result.html).toContain("https://cygnex.co/invitations/accept?token=test-token");

    expect(result.html).toContain("<html");
    expect(result.html).toContain("<table");
  });

  it("escapes untrusted organization and message content", () => {
    const result = organizationInvitationEmail(
      "https://cygnex.co/invitations/accept?token=test-token",
      '<script>alert("x")</script>',
      '<img src=x>',
      {
        message: '<script>alert("message")</script>',
      },
    );

    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain('<img src=x>');
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("renders invitation cancellation using the Cygnex enterprise layout", () => {
    const result = invitationRevokedEmail("Acme Capital");

    expect(result.subject).toBe(
      "Your invitation to Acme Capital was cancelled",
    );

    expect(result.html).toContain("Organization invitation");
    expect(result.html).toContain("Invitation cancelled");
    expect(result.html).toContain("Acme Capital");
    expect(result.html).toContain("cygnex.co");
    expect(result.html).toContain("<html");
    expect(result.html).toContain("<table");
  });
});
