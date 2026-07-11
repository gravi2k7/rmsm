import { PasswordService } from "./password.service";
import { ValidationError } from "@rmsm/shared";
import type { Env } from "@rmsm/config";

const testConfig = { PASSWORD_MIN_LENGTH: 12 } as Env;

describe("PasswordService", () => {
  const service = new PasswordService(testConfig);

  it("throws ValidationError for a policy-violating password", async () => {
    await expect(service.hash("short")).rejects.toThrow(ValidationError);
  });

  it("hashes and verifies a compliant password round-trip", async () => {
    const hash = await service.hash("Str0ng!Passw0rd");
    expect(hash).not.toBe("Str0ng!Passw0rd");
    expect(await service.verify(hash, "Str0ng!Passw0rd")).toBe(true);
    expect(await service.verify(hash, "wrong-password")).toBe(false);
  });

  it("produces a different hash for the same password on each call (random salt)", async () => {
    const h1 = await service.hash("Str0ng!Passw0rd");
    const h2 = await service.hash("Str0ng!Passw0rd");
    expect(h1).not.toBe(h2);
  });
});
