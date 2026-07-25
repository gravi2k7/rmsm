import { describe, it, expect } from "vitest";
import { EmptyTranslationInputError, UnsupportedLanguagePairError, LocaleKeyNotFoundError } from "../errors/translation-domain.errors";

describe("translation domain errors", () => {
  it("EmptyTranslationInputError carries a stable code", () => {
    expect(new EmptyTranslationInputError().code).toBe("EMPTY_TRANSLATION_INPUT");
  });
  it("UnsupportedLanguagePairError carries a stable code", () => {
    expect(new UnsupportedLanguagePairError("en", "fr").code).toBe("UNSUPPORTED_LANGUAGE_PAIR");
  });
  it("LocaleKeyNotFoundError carries a stable code", () => {
    expect(new LocaleKeyNotFoundError("greeting", "es").code).toBe("LOCALE_KEY_NOT_FOUND");
  });
});
