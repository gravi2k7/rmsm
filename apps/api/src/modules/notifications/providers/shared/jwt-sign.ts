import { createSign } from "crypto";

/**
 * Minimal JWT signing (RS256/ES256 only — the two algorithms FCM's
 * Google OAuth2 service-account flow and APNs' token-based auth
 * respectively require) implemented directly against Node's `crypto`
 * module. No `jsonwebtoken` package — consistent with this project's
 * "no protocol/vendor library coupling" rule applied everywhere else
 * (SMTP's raw sockets, every provider's raw REST signing).
 */
function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKeyPem: string,
  algorithm: "RS256" | "ES256",
): string {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign(algorithm === "RS256" ? "RSA-SHA256" : "SHA256");
  signer.update(signingInput);
  signer.end();

  const signature =
    algorithm === "RS256"
      ? signer.sign(privateKeyPem)
      : signer.sign({ key: privateKeyPem, dsaEncoding: "ieee-p1363" });

  return `${signingInput}.${base64url(signature)}`;
}
