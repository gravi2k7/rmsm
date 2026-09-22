import { describe, expect, it } from "@jest/globals";
import { BrokerCredentialsEncryptionService } from "./broker-credentials-encryption.service";

describe("BrokerCredentialsEncryptionService", () => {
  function createService(key = "b".repeat(64)) {
    return new BrokerCredentialsEncryptionService({
      BROKER_CREDENTIALS_ENCRYPTION_KEY: key,
    } as never);
  }

  it("encrypts and decrypts ProjectX credentials", () => {
    const service = createService();

    const credentials = {
      username: "projectx-demo-user",
      apiKey: "projectx-demo-secret",
      baseUrl: "https://api.topstepx.com",
    };

    const encrypted = service.encrypt(credentials);

    expect(encrypted).not.toContain(credentials.username);
    expect(encrypted).not.toContain(credentials.apiKey);

    expect(service.decrypt(encrypted)).toEqual(credentials);
  });

  it("uses a unique IV so identical credentials produce different ciphertext", () => {
    const service = createService();

    const credentials = {
      username: "same-user",
      apiKey: "same-key",
    };

    const first = service.encrypt(credentials);
    const second = service.encrypt(credentials);

    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toEqual(credentials);
    expect(service.decrypt(second)).toEqual(credentials);
  });

  it("rejects tampered ciphertext", () => {
    const service = createService();

    const encrypted = service.encrypt({
      username: "user",
      apiKey: "secret",
    });

    const [iv, tag, data] = encrypted.split(":");
    const lastByte = data.at(-1) === "0" ? "1" : "0";
    const tampered = `${iv}:${tag}:${data.slice(0, -1)}${lastByte}`;

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it("cannot decrypt credentials with a different key", () => {
    const serviceA = createService("a".repeat(64));
    const serviceB = createService("b".repeat(64));

    const encrypted = serviceA.encrypt({
      username: "user",
      apiKey: "secret",
    });

    expect(() => serviceB.decrypt(encrypted)).toThrow();
  });

  it("rejects malformed encrypted payloads", () => {
    const service = createService();

    expect(() => service.decrypt("not-a-valid-payload")).toThrow(
      "Malformed encrypted broker credentials payload.",
    );
  });
});
