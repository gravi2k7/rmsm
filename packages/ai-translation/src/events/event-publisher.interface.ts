import type { TranslationDomainEvent } from "./translation-domain-events.interface";

export interface EventPublisher {
  publish(events: readonly TranslationDomainEvent[]): Promise<void>;
}
