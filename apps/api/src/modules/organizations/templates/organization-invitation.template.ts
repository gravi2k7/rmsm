/** Mirrors the plain, dependency-free template style established in modules/email/templates/auth.templates.ts. */
export function organizationInvitationEmail(
  link: string,
  organizationName: string,
  role: string,
  options: { message?: string; expiresInDays?: number } = {},
) {
  const expiresInDays = options.expiresInDays ?? 7;
  const messageHtml = options.message
    ? `<p>"${escapeHtml(options.message)}"</p>`
    : "";
  return {
    subject: `You've been invited to join ${organizationName} on RMSM AI`,
    html: `<p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>${messageHtml}<p><a href="${link}">${link}</a></p><p>This invitation expires in ${expiresInDays} day${expiresInDays === 1 ? "" : "s"}.</p>`,
  };
}

export function invitationRevokedEmail(organizationName: string) {
  return {
    subject: `Your invitation to ${organizationName} was cancelled`,
    html: `<p>Your pending invitation to join <strong>${organizationName}</strong> has been cancelled by the organization.</p>`,
  };
}

/** WM-020E — the invitation message is free-text supplied by the inviter, so it's escaped before interpolation into the HTML email body (none of the other values here are user-supplied free text). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
