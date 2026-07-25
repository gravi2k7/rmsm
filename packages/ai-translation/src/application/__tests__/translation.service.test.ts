import { describe, it, expect } from "vitest";
import { TranslationService } from "../services/translation.service";
import { DictionaryTranslationProvider } from "../../infrastructure/dictionary-translation.provider";
import { EmptyTranslationInputError } from "../../domain/errors/translation-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

const dictionary = { en: { es: { hello: "hola" } } };

describe("TranslationService", () => {
  it("translates using a caller-supplied source language, publishing only TranslationCompleted", async () => {
    const events = new RecordingEventPublisher();
    const service = new TranslationService(new DictionaryTranslationProvider(dictionary), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const result = await service.translate({ text: "hello", sourceLanguage: "en", targetLanguage: "es" });

    expect(result.translatedText).toBe("hola");
    expect(events.published.map((e) => e.kind)).toEqual(["TranslationCompleted"]);
  });

  it("detects the source language when omitted, publishing LanguageDetected then TranslationCompleted", async () => {
    const events = new RecordingEventPublisher();
    const service = new TranslationService(new DictionaryTranslationProvider(dictionary), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const result = await service.translate({ text: "hello", targetLanguage: "es" });

    expect(result.sourceLanguage).toBe("en");
    expect(events.published.map((e) => e.kind)).toEqual(["LanguageDetected", "TranslationCompleted"]);
  });

  it("rejects empty text", async () => {
    const service = new TranslationService(new DictionaryTranslationProvider(dictionary), new FixedClock(new Date()), new SequentialIdGenerator());
    await expect(service.translate({ text: "   ", targetLanguage: "es" })).rejects.toThrow(EmptyTranslationInputError);
  });
});
