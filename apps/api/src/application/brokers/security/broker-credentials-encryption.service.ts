import { Inject, Injectable } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../config/app-config.module";

@Injectable()
export class BrokerCredentialsEncryptionService {
  constructor(@Inject(APP_CONFIG) private readonly config: Env) {}

  encrypt(credentials: object): string {
    const key = this.derivedKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const plaintext = JSON.stringify(credentials);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted.toString("hex"),
    ].join(":");
  }

  decrypt<T = Record<string, unknown>>(payload: string): T {
    const parts = payload.split(":");

    if (parts.length !== 3) {
      throw new Error("Malformed encrypted broker credentials payload.");
    }

    const [ivHex, tagHex, dataHex] = parts as [string, string, string];

    const key = this.derivedKey();

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivHex, "hex"),
    );

    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as T;
  }

  private derivedKey(): Buffer {
    return createHash("sha256")
      .update(this.config.BROKER_CREDENTIALS_ENCRYPTION_KEY)
      .digest();
  }
}
