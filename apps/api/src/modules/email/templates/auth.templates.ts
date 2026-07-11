/** Plain, dependency-free template functions — swap for a real templating engine later without touching callers. */

export function verificationEmail(link: string) {
  return {
    subject: "Verify your RMSM AI account",
    html: `<p>Welcome to RMSM AI. Please verify your email address:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  };
}

export function passwordResetEmail(link: string) {
  return {
    subject: "Reset your RMSM AI password",
    html: `<p>We received a request to reset your password.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
  };
}

export function welcomeEmail() {
  return {
    subject: "Welcome to RMSM AI",
    html: `<p>Your account is verified and ready. Welcome aboard.</p>`,
  };
}

export function securityAlertEmail(event: string, ipAddress?: string) {
  return {
    subject: "Security alert on your RMSM AI account",
    html: `<p>We noticed the following security event on your account: <strong>${event}</strong>.</p>${
      ipAddress ? `<p>IP address: ${ipAddress}</p>` : ""
    }<p>If this wasn't you, reset your password immediately.</p>`,
  };
}
