import { Inject, Injectable } from "@nestjs/common";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * TOTP-based 2FA (RFC 6238), matching any standard authenticator app
 * (Google Authenticator, Authy, 1Password, etc). Secrets are encrypted at
 * rest with AES-256-GCM before being persisted — a DB leak alone does not
 * expose usable TOTP seeds.
 *
 * Extension point: SMS/email OTP can be added later as a sibling method
 * (e.g. `SmsOtpService`) behind the same `TwoFactorMethod` concept without
 * touching this class — see the Module 002 doc's "Future Extension Points".
 */
@Injectable()
export class TwoFactorService {
  constructor(@Inject(APP_CONFIG) private readonly config: Env) {}

  generateSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, this.config.TWO_FACTOR_ISSUER, secret);
    return { secret, otpauthUrl };
  }

  toQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }

  encryptSecret(secret: string): string {
    const key = this.derivedKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
  }

  decryptSecret(payload: string): string {
    const parts = payload.split(":");
    if (parts.length !== 3) throw new Error("Malformed encrypted 2FA secret payload.");
    const [ivHex, tagHex, dataHex] = parts as [string, string, string];
    const key = this.derivedKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  generateRecoveryCodes(count = 10): { raw: string[]; hashes: string[] } {
    const raw = Array.from({ length: count }, () =>
      randomBytes(5).toString("hex").match(/.{1,4}/g)!.join("-"),
    );
    const hashes = raw.map((code) => createHash("sha256").update(code).digest("hex"));
    return { raw, hashes };
  }

  hashRecoveryCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  private derivedKey(): Buffer {
    // TWO_FACTOR_ENCRYPTION_KEY is validated as >=32 chars at config load;
    // hash it down to a stable 32-byte AES-256 key.
    return createHash("sha256").update(this.config.TWO_FACTOR_ENCRYPTION_KEY).digest();
  }
}
