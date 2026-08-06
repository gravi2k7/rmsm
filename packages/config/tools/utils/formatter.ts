import type { EnvVariableMetadata } from "../types";

const SENSITIVE_DEFAULTS = new Set([
  "COOKIE_SECRET",
  "TWO_FACTOR_ENCRYPTION_KEY",
  "NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY",
  "MOCK_WEBHOOK_SECRET",
]);

export function formatVariable(
  variable: EnvVariableMetadata,
): string {

  if (SENSITIVE_DEFAULTS.has(variable.name)) {
    return `${variable.name}=`;
  }

  if (variable.defaultValue === undefined) {
    return `${variable.name}=`;
  }

  return `${variable.name}=${String(variable.defaultValue)}`;
}