import type { IdGenerator, Clock } from "@rmsm/core";
import type { FieldMapping } from "../../domain/entities/field-mapping.entity";
import { InvalidFieldMappingError } from "../../domain/errors/extraction-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { FieldsMappedEvent } from "../../events/extraction-domain-events.interface";

export type TransformFn = (value: unknown) => unknown;

/**
 * The "domain mapping" capability: applies a list of `FieldMapping`s to
 * rename (and optionally transform) fields on a raw extracted object
 * into the shape a downstream domain model expects — e.g. turning
 * `{ full_name: "..." }` extracted from a document into
 * `{ customerName: "..." }` for an application's own entity.
 */
export class DomainMappingService {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async map(
    source: Readonly<Record<string, unknown>>,
    mappings: readonly FieldMapping[],
    transforms?: Readonly<Record<string, TransformFn>>,
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      if (!(mapping.sourceField in source)) {
        throw new InvalidFieldMappingError(`source field "${mapping.sourceField}" does not exist on the input object`);
      }
      const rawValue = source[mapping.sourceField];
      const transform = transforms?.[mapping.targetField];
      result[mapping.targetField] = transform ? transform(rawValue) : rawValue;
    }

    if (this.eventPublisher) {
      const event: FieldsMappedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "FieldsMapped",
        occurredAt: this.clock.now(),
        aggregateId: this.idGenerator.generate(),
        mappedFieldCount: mappings.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return result;
  }
}
