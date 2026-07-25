import type { IdGenerator, Clock } from "@rmsm/core";
import type { TranslationProvider } from "../../repositories/translation-provider.interface";
import type { TranslationRequest } from "../../domain/entities/translation-request.entity";
import type { TranslationResult } from "../../domain/entities/translation-result.entity";
import { EmptyTranslationInputError } from "../../domain/errors/translation-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { TranslationCompletedEvent, LanguageDetectedEvent, TranslationDomainEvent } from "../../events/translation-domain-events.interface";

/** Thin orchestration over the injected `TranslationProvider`:
 * validates input, detects the source language when the caller didn't
 * supply one (publishing `LanguageDetected` when that happens), then
 * translates and publishes `TranslationCompleted`. */
export class TranslationService {
  constructor(
    private readonly provider: TranslationProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    if (!request.text.trim()) {
      throw new EmptyTranslationInputError();
    }

    let effectiveRequest = request;
    if (!request.sourceLanguage) {
      const detected = await this.provider.detectLanguage(request.text);
      effectiveRequest = { ...request, sourceLanguage: detected };
      await this.publish([this.languageDetectedEvent(detected)]);
    }

    const result = await this.provider.translate(effectiveRequest);
    await this.publish([this.translationCompletedEvent(result)]);
    return result;
  }

  private languageDetectedEvent(detectedLanguage: string): LanguageDetectedEvent {
    return { eventId: this.idGenerator.generate(), kind: "LanguageDetected", occurredAt: this.clock.now(), aggregateId: detectedLanguage, detectedLanguage };
  }

  private translationCompletedEvent(result: TranslationResult): TranslationCompletedEvent {
    return {
      eventId: this.idGenerator.generate(),
      kind: "TranslationCompleted",
      occurredAt: this.clock.now(),
      aggregateId: `${result.sourceLanguage}->${result.targetLanguage}`,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
    };
  }

  private async publish(events: readonly TranslationDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
