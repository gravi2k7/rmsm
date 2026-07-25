import { describe, it, expect } from "vitest";
import { DictionaryTranslationProvider } from "../dictionary-translation.provider";
import { EmptyTranslationInputError, UnsupportedLanguagePairError } from "../../domain/errors/translation-domain.errors";

const dictionary = {
  en: { es: { hello: "hola", world: "mundo" } },
  es: { en: { hola: "hello", mundo: "world" } },
};

describe("DictionaryTranslationProvider", () => {
  const provider = new DictionaryTranslationProvider(dictionary);

  it("translates known words and preserves spacing/unknown words", async () => {
    const result = await provider.translate({ text: "hello world", sourceLanguage: "en", targetLanguage: "es" });
    expect(result.translatedText).toBe("hola mundo");
    expect(result.confidence).toBe(1);
  });

  it("reports partial confidence when only some words are known", async () => {
    const result = await provider.translate({ text: "hello there", sourceLanguage: "en", targetLanguage: "es" });
    expect(result.translatedText).toBe("hola there");
    expect(result.confidence).toBe(0.5);
  });

  it("detects the source language from vocabulary overlap", async () => {
    expect(await provider.detectLanguage("hola mundo")).toBe("es");
    expect(await provider.detectLanguage("hello world")).toBe("en");
  });

  it("throws EmptyTranslationInputError for empty text", async () => {
    await expect(provider.translate({ text: "   ", sourceLanguage: "en", targetLanguage: "es" })).rejects.toThrow(EmptyTranslationInputError);
  });

  it("throws UnsupportedLanguagePairError for an unknown language pair", async () => {
    await expect(provider.translate({ text: "hello", sourceLanguage: "en", targetLanguage: "de" })).rejects.toThrow(UnsupportedLanguagePairError);
  });
});
