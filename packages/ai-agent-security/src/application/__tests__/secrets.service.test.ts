import { describe, expect, it } from "vitest";
import { SecretsService } from "../services/secrets.service";
import { SecretNotFoundError } from "../../domain/errors/agent-security-domain.errors";
import { InMemorySecretsProvider } from "./fakes";

describe("SecretsService", () => {
  it("returns a known secret", async () => {
    const service = new SecretsService(new InMemorySecretsProvider({ "api-key": "shh" }));
    expect(await service.getSecret("api-key")).toBe("shh");
  });

  it("throws SecretNotFoundError for an unknown secret", async () => {
    const service = new SecretsService(new InMemorySecretsProvider({}));
    await expect(service.getSecret("missing")).rejects.toThrow(SecretNotFoundError);
  });
});
