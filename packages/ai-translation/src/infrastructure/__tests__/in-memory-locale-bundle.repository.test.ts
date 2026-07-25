import { describe, it, expect } from "vitest";
import { InMemoryLocaleBundleRepository } from "../in-memory-locale-bundle.repository";

describe("InMemoryLocaleBundleRepository", () => {
  it("saves and finds a bundle by language", async () => {
    const repository = new InMemoryLocaleBundleRepository();
    const bundle = { language: "en", entries: { hello: "Hello" } };
    await repository.save(bundle);
    expect(await repository.findByLanguage("en")).toEqual(bundle);
  });

  it("returns null for a missing language", async () => {
    const repository = new InMemoryLocaleBundleRepository();
    expect(await repository.findByLanguage("fr")).toBeNull();
  });
});
