import { emailLayout, escapeHtml } from "./email-layout";

export function verificationEmail(link: string) {
  return {
    subject: "Verify your Cygnex account",
    html: emailLayout({
      preheader: "Verify your email address to activate your Cygnex account.",
      eyebrow: "Account verification",
      title: "Verify your email address",
      intro: "Welcome to Cygnex. Please confirm your email address to complete your account setup.",
      content: `
        <p style="margin:0 0 16px;">
          Your verification link is valid for <strong>24 hours</strong>.
        </p>
        <p style="margin:0;">
          Once verified, you can securely sign in and access RMSM AI.
        </p>
      `,
      cta: {
        label: "Verify email address",
        url: link,
      },
      notice:
        "If you did not create this account, you can safely ignore this email.",
    }),
  };
}

export function passwordResetEmail(link: string) {
  return {
    subject: "Reset your Cygnex password",
    html: emailLayout({
      preheader: "Use this secure link to reset your Cygnex password.",
      eyebrow: "Account security",
      title: "Reset your password",
      intro: "We received a request to reset the password for your Cygnex account.",
      content: `
        <p style="margin:0 0 16px;">
          Use the button below to choose a new password.
        </p>
        <p style="margin:0;">
          For your security, reset links are time-limited and can only be used once.
        </p>
      `,
      cta: {
        label: "Reset password",
        url: link,
      },
      notice:
        "If you did not request a password reset, no action is required. Your password will remain unchanged.",
    }),
  };
}

export function welcomeEmail() {
  return {
    subject: "Welcome to Cygnex",
    html: emailLayout({
      preheader: "Your Cygnex account is ready.",
      eyebrow: "Welcome",
      title: "Welcome to Cygnex",
      intro: "Your account has been verified and is ready to use.",
      content: `
        <p style="margin:0;">
          You can now sign in and begin using RMSM AI.
        </p>
      `,
      cta: {
        label: "Open Cygnex",
        url: "https://cygnex.co",
      },
    }),
  };
}

export function securityAlertEmail(event: string, ipAddress?: string) {
  const safeEvent = escapeHtml(event);
  const safeIpAddress = ipAddress ? escapeHtml(ipAddress) : undefined;

  return {
    subject: "Security alert on your Cygnex account",
    html: emailLayout({
      preheader: "A security event was detected on your Cygnex account.",
      eyebrow: "Security alert",
      title: "Security event detected",
      intro: "We noticed a security-related event on your Cygnex account.",
      content: `
        <p style="margin:0 0 14px;">
          <strong>Event:</strong> ${safeEvent}
        </p>
        ${
          ipAddress
            ? `
              <p style="margin:0;">
                <strong>IP address:</strong> ${safeIpAddress}
              </p>
            `
            : ""
        }
      `,
      cta: {
        label: "Open Cygnex",
        url: "https://cygnex.co",
      },
      notice:
        "If this activity was not performed by you, change your password immediately and review your account security.",
    }),
  };
}
