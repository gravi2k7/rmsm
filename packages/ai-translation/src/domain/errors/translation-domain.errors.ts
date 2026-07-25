import { DomainError } from "@rmsm/core";

export class EmptyTranslationInputError extends DomainError {
  constructor() {
    super("Cannot translate empty text.", "EMPTY_TRANSLATION_INPUT");
  }
}

export class UnsupportedLanguagePairError extends DomainError {
  constructor(sourceLanguage: string, targetLanguage: string) {
    super(`No translation is available from "${sourceLanguage}" to "${targetLanguage}".`, "UNSUPPORTED_LANGUAGE_PAIR");
  }
}

export class LocaleKeyNotFoundError extends DomainError {
  constructor(key: string, language: string) {
    super(`Localization key "${key}" was not found for language "${language}" (or its fallback).`, "LOCALE_KEY_NOT_FOUND");
  }
}
