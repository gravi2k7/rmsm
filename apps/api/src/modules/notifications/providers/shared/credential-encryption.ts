import { Injectable, Inject } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";

/**
 * AES-256-GCM encryption for provider credential blobs — same technique
 * as Module 002's TwoFactorService (encryptSecret/decryptSecret), a new
 * key (NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY, per the Provider
 * Integration Guide), not a shared one. Each provider's credentials are
 * encrypted as one JSON blob (arbitrary shape per provider type) rather
 * than one encrypted column per field, since the credential shape varies
 * significantly by provider (SMTP needs host/port/username/password; SES
 * needs an access key pair; SendGrid needs just one API key) and this
 * schema's `credentialsEnc` column is intentionally provider-agnostic.
 */
@Injectable()
export class CredentialEncryptionService {
  constructor(@Inject(APP_CONFIG) private readonly config: Env) {}

  encrypt(credentials: object): string {
    const key = this.derivedKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plaintext = JSON.stringify(credentials);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
  }

  decrypt<T = Record<string, unknown>>(payload: string): T {
    const parts = payload.split(":");
    if (parts.length !== 3) throw new Error("Malformed encrypted provider credentials payload.");
    const [ivHex, tagHex, dataHex] = parts as [string, string, string];
    const key = this.derivedKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  }

  private derivedKey(): Buffer {
    return createHash("sha256").update(this.config.NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY).digest();
  }
}
