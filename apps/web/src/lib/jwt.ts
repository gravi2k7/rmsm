/** Decodes a JWT's payload without verifying its signature. This is only
 * ever used to read the `exp` claim for client-side session-timeout UX
 * (warning the trader before their access token expires) — it is never
 * used to make an authorization decision, which is the API's job alone.
 * Returns `null` for a malformed token rather than throwing, since a
 * decode failure here should degrade to "no timeout warning shown", not
 * crash the app. */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Returns the token's `exp` claim in epoch milliseconds, or `null` if
 * absent/unparseable. */
export function getJwtExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  return typeof payload?.exp === "number" ? payload.exp * 1000 : null;
}
