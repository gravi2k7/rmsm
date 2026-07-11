/**
 * Configurable password policy — pure functions so both apps/api (server
 * enforcement) and apps/web (client-side UX feedback) share one source of
 * truth. Server-side enforcement is always authoritative; client-side use
 * is for UX only.
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
};

export interface PasswordPolicyResult {
  valid: boolean;
  failures: string[];
}

export function checkPasswordPolicy(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordPolicyResult {
  const failures: string[] = [];

  if (password.length < policy.minLength) {
    failures.push(`Must be at least ${policy.minLength} characters.`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    failures.push("Must contain an uppercase letter.");
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    failures.push("Must contain a lowercase letter.");
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    failures.push("Must contain a number.");
  }
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    failures.push("Must contain a symbol.");
  }

  return { valid: failures.length === 0, failures };
}
