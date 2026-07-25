import type { IdGenerator, Clock } from "@rmsm/core";
import type { JsonExtractionProvider } from "../../repositories/json-extraction-provider.interface";
import type { ExtractionSchema } from "../../domain/entities/extraction-schema.entity";
import type { ExtractionResult } from "../../domain/entities/extraction-result.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { JsonExtractedEvent, SchemaValidatedEvent, SchemaValidationFailedEvent, ExtractionDomainEvent } from "../../events/extraction-domain-events.interface";

/**
 * The "schema-driven extraction" + "JSON extraction" + "validation"
 * capabilities in one pipeline: pull raw JSON out of text via the
 * injected `JsonExtractionProvider`, then validate it against a caller
 * -supplied zod `ExtractionSchema`. Never throws on a validation
 * failure — `ExtractionResult.valid`/`errors` carry the outcome, so a
 * caller can decide what to do with malformed data (retry, fall back,
 * surface to a human) rather than this service deciding for them.
 */
export class SchemaExtractionService {
  constructor(
    private readonly jsonExtractionProvider: JsonExtractionProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async extract<T>(text: string, schema: ExtractionSchema<T>): Promise<ExtractionResult<T>> {
    const raw = await this.jsonExtractionProvider.extractJson(text);
    await this.publish([this.jsonExtractedEvent()]);

    const parsed = schema.schema.safeParse(raw);
    if (parsed.success) {
      await this.publish([this.validatedEvent(schema.name)]);
      return { data: parsed.data, raw, valid: true, errors: [] };
    }

    const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    await this.publish([this.validationFailedEvent(schema.name, errors.length)]);
    return { data: null, raw, valid: false, errors };
  }

  private jsonExtractedEvent(): JsonExtractedEvent {
    return { eventId: this.idGenerator.generate(), kind: "JsonExtracted", occurredAt: this.clock.now(), aggregateId: this.idGenerator.generate() };
  }

  private validatedEvent(schemaName: string): SchemaValidatedEvent {
    return { eventId: this.idGenerator.generate(), kind: "SchemaValidated", occurredAt: this.clock.now(), aggregateId: schemaName, schemaName };
  }

  private validationFailedEvent(schemaName: string, issueCount: number): SchemaValidationFailedEvent {
    return { eventId: this.idGenerator.generate(), kind: "SchemaValidationFailed", occurredAt: this.clock.now(), aggregateId: schemaName, schemaName, issueCount };
  }

  private async publish(events: readonly ExtractionDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
