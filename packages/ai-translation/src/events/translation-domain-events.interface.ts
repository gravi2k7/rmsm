import type { DomainEvent } from "@rmsm/core";

export interface TranslationCompletedEvent extends DomainEvent {
  readonly kind: "TranslationCompleted";
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
}

export interface LanguageDetectedEvent extends DomainEvent {
  readonly kind: "LanguageDetected";
  readonly detectedLanguage: string;
}

export interface LocalizationResolvedEvent extends DomainEvent {
  readonly kind: "LocalizationResolved";
  readonly key: string;
  readonly language: string;
  readonly usedFallback: boolean;
}

export interface LocalizationKeyMissingEvent extends DomainEvent {
  readonly kind: "LocalizationKeyMissing";
  readonly key: string;
  readonly language: string;
}

export type TranslationDomainEvent =
  | TranslationCompletedEvent
  | LanguageDetectedEvent
  | LocalizationResolvedEvent
  | LocalizationKeyMissingEvent;
