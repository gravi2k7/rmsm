import { describe, it, expect, beforeEach } from "vitest";
import { LocalizationService } from "../services/localization.service";
import { InMemoryLocaleBundleRepository } from "../../infrastructure/in-memory-locale-bundle.repository";
import { LocaleKeyNotFoundError } from "../../domain/errors/translation-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("LocalizationService", () => {
  let repository: InMemoryLocaleBundleRepository;
  let events: RecordingEventPublisher;
  let service: LocalizationService;

  beforeEach(async () => {
    repository = new InMemoryLocaleBundleRepository();
    await repository.save({ language: "en", entries: { greeting: "Hello", farewell: "Goodbye" } });
    await repository.save({ language: "es", entries: { greeting: "Hola" } });
    events = new RecordingEventPublisher();
    service = new LocalizationService(repository, new FixedClock(new Date()), new SequentialIdGenerator(), events);
  });

  it("resolves a key directly from the target language's bundle", async () => {
    const value = await service.resolve("greeting", "es");
    expect(value).toBe("Hola");
    expect(events.published.map((e) => e.kind)).toEqual(["LocalizationResolved"]);
  });

  it("falls back to a second language's bundle when the key is missing", async () => {
    const value = await service.resolve("farewell", "es", "en");
    expect(value).toBe("Goodbye");
    const resolved = events.published[0] as { usedFallback: boolean };
    expect(resolved.usedFallback).toBe(true);
  });

  it("throws LocaleKeyNotFoundError and publishes LocalizationKeyMissing when the key is missing everywhere", async () => {
    await expect(service.resolve("missing", "es", "en")).rejects.toThrow(LocaleKeyNotFoundError);
    expect(events.published.map((e) => e.kind)).toEqual(["LocalizationKeyMissing"]);
  });
});
