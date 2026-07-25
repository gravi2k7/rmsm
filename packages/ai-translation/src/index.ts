// @rmsm/ai-translation public API (AI-307 Translation Engine)

// Domain: entities
export type { TranslationRequest } from "./domain/entities/translation-request.entity";
export type { TranslationResult } from "./domain/entities/translation-result.entity";
export type { LocaleBundle } from "./domain/entities/locale-bundle.entity";

// Domain: errors
export {
  EmptyTranslationInputError,
  UnsupportedLanguagePairError,
  LocaleKeyNotFoundError,
} from "./domain/errors/translation-domain.errors";

// Ports
export type { TranslationProvider } from "./repositories/translation-provider.interface";
export type { LocaleBundleRepository } from "./repositories/locale-bundle-repository.interface";

// Events
export type {
  TranslationCompletedEvent,
  LanguageDetectedEvent,
  LocalizationResolvedEvent,
  LocalizationKeyMissingEvent,
  TranslationDomainEvent,
} from "./events/translation-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { TranslationService } from "./application/services/translation.service";
export { LocalizationService } from "./application/services/localization.service";

// Infrastructure
export { DictionaryTranslationProvider, type TranslationDictionary } from "./infrastructure/dictionary-translation.provider";
export { InMemoryLocaleBundleRepository } from "./infrastructure/in-memory-locale-bundle.repository";
export { InMemoryEventPublisher, type TranslationEventListener } from "./infrastructure/in-memory-event-publisher";
