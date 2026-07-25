import type { IdGenerator, Clock } from "@rmsm/core";
import type { LocaleBundleRepository } from "../../repositories/locale-bundle-repository.interface";
import { LocaleKeyNotFoundError } from "../../domain/errors/translation-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { LocalizationResolvedEvent, LocalizationKeyMissingEvent, TranslationDomainEvent } from "../../events/translation-domain-events.interface";

/** Resolves one localization key for a language, falling back to a
 * second language's bundle (e.g. a base "en" bundle) when the primary
 * language's bundle doesn't have the key — the package's "localization"
 * capability, kept separate from `TranslationService`: this is about
 * looking up pre-translated strings, not machine-translating on the fly. */
export class LocalizationService {
  constructor(
    private readonly repository: LocaleBundleRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async resolve(key: string, language: string, fallbackLanguage?: string): Promise<string> {
    const bundle = await this.repository.findByLanguage(language);
    const direct = bundle?.entries[key];
    if (direct !== undefined) {
      await this.publish([this.resolvedEvent(key, language, false)]);
      return direct;
    }

    if (fallbackLanguage) {
      const fallbackBundle = await this.repository.findByLanguage(fallbackLanguage);
      const fallbackValue = fallbackBundle?.entries[key];
      if (fallbackValue !== undefined) {
        await this.publish([this.resolvedEvent(key, language, true)]);
        return fallbackValue;
      }
    }

    await this.publish([this.missingEvent(key, language)]);
    throw new LocaleKeyNotFoundError(key, language);
  }

  private resolvedEvent(key: string, language: string, usedFallback: boolean): LocalizationResolvedEvent {
    return { eventId: this.idGenerator.generate(), kind: "LocalizationResolved", occurredAt: this.clock.now(), aggregateId: key, key, language, usedFallback };
  }

  private missingEvent(key: string, language: string): LocalizationKeyMissingEvent {
    return { eventId: this.idGenerator.generate(), kind: "LocalizationKeyMissing", occurredAt: this.clock.now(), aggregateId: key, key, language };
  }

  private async publish(events: readonly TranslationDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
