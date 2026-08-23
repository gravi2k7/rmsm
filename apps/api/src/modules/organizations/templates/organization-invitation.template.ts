import { emailLayout } from "../../email/templates/email-layout";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface OrganizationInvitationEmailOptions {
  message?: string;
  expiresInDays?: number;
}

/**
 * Enterprise Cygnex organization invitation email.
 *
 * This module intentionally preserves the existing public function
 * signatures used by OrganizationInvitationService while moving all
 * presentation into the centralized Cygnex email design system.
 */
export function organizationInvitationEmail(
  link: string,
  organizationName: string,
  role: string,
  options: OrganizationInvitationEmailOptions = {},
) {
  const expiresInDays = options.expiresInDays ?? 7;
  const safeOrganizationName = escapeHtml(organizationName);
  const safeRole = escapeHtml(role);

  const messageHtml = options.message
    ? `
        <p style="margin:0 0 16px;">
          <strong>Message from your inviter</strong>
        </p>
        <p style="margin:0 0 16px;">
          ${escapeHtml(options.message)}
        </p>
      `
    : "";

  return {
    subject: `You've been invited to join ${organizationName} on RMSM AI`,
    html: emailLayout({
      preheader: `You've been invited to join ${organizationName} on Cygnex.`,
      eyebrow: "Organization invitation",
      title: "You're invited",
      intro: `You've been invited to join <strong>${safeOrganizationName}</strong> on Cygnex.`,
      content: `
        <p style="margin:0 0 16px;">
          Your assigned role is <strong>${safeRole}</strong>.
        </p>

        ${messageHtml}

        <p style="margin:0;">
          This invitation expires in
          <strong>${expiresInDays} day${expiresInDays === 1 ? "" : "s"}</strong>.
        </p>
      `,
      cta: {
        label: "Accept invitation",
        url: link,
      },
      notice:
        "If you were not expecting this invitation, you can safely ignore this email.",
    }),
  };
}

export function invitationRevokedEmail(organizationName: string) {
  const safeOrganizationName = escapeHtml(organizationName);

  return {
    subject: `Your invitation to ${organizationName} was cancelled`,
    html: emailLayout({
      preheader: `Your invitation to join ${organizationName} has been cancelled.`,
      eyebrow: "Organization invitation",
      title: "Invitation cancelled",
      intro: `Your pending invitation to join <strong>${safeOrganizationName}</strong> on Cygnex has been cancelled.`,
      content: `
        <p style="margin:0;">
          You no longer have an active invitation to this organization.
        </p>
      `,
      notice:
        "If you believe this was cancelled in error, please contact an administrator of the organization.",
    }),
  };
}
