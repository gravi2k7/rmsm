/** Mirrors the plain, dependency-free template style established in modules/email/templates/auth.templates.ts. */
export function organizationInvitationEmail(link: string, organizationName: string, role: string) {
  return {
    subject: `You've been invited to join ${organizationName} on RMSM AI`,
    html: `<p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p><p><a href="${link}">${link}</a></p><p>This invitation expires in 7 days.</p>`,
  };
}

export function invitationRevokedEmail(organizationName: string) {
  return {
    subject: `Your invitation to ${organizationName} was cancelled`,
    html: `<p>Your pending invitation to join <strong>${organizationName}</strong> has been cancelled by the organization.</p>`,
  };
}
