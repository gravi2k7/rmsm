import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * SSRF protection for organization-configured outbound webhook URLs
 * (Phase 2c's WebhookService fetches these server-side on the platform's
 * behalf) — a real gap found during this phase's security review, not a
 * hypothetical: `@IsUrl()` (the DTO's only prior check) validates syntax,
 * not destination safety. Without this, an org admin could register a
 * webhook pointing at `localhost`, a cloud metadata endpoint
 * (`169.254.169.254`), or an internal-only service, and every triggered
 * event would have this server make that request on the attacker's
 * behalf.
 *
 * Checked twice: once at webhook registration (reject obviously-unsafe
 * URLs upfront) and once again immediately before each trigger (defense
 * in depth against DNS rebinding — a hostname that resolved safely at
 * registration time could resolve to a private address by the time it's
 * actually triggered). Not a complete DNS-rebinding defense (that needs
 * pinning the resolved IP through the actual fetch, which Node's fetch
 * doesn't expose a hook for) — flagged as a real, remaining limitation,
 * not silently presented as fully solved.
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "metadata.google.internal"]);

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts as [number, number, number, number];
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 0) return true; // 0.0.0.0/8
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
  }
  return false;
}

export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Webhook URL is not a valid URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Webhook URL must use http or https.");
  }
  if (BLOCKED_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
    throw new Error("Webhook URL points to a disallowed host.");
  }
  if (isIP(parsed.hostname) && isPrivateOrReservedIp(parsed.hostname)) {
    throw new Error("Webhook URL resolves to a private or reserved IP address.");
  }

  // Hostname (not a literal IP) — resolve and check the actual address,
  // since "safe-looking-domain.com" could still resolve to an internal IP.
  if (!isIP(parsed.hostname)) {
    try {
      const { address } = await lookup(parsed.hostname);
      if (isPrivateOrReservedIp(address)) {
        throw new Error("Webhook URL's hostname resolves to a private or reserved IP address.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("private or reserved")) throw error;
      throw new Error(`Webhook URL's hostname could not be resolved: ${rawUrl}`);
    }
  }
}
