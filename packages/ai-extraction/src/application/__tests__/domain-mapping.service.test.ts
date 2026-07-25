import { describe, it, expect } from "vitest";
import { DomainMappingService } from "../services/domain-mapping.service";
import { InvalidFieldMappingError } from "../../domain/errors/extraction-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("DomainMappingService", () => {
  it("renames fields per the mapping and publishes FieldsMapped", async () => {
    const events = new RecordingEventPublisher();
    const service = new DomainMappingService(new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const result = await service.map(
      { full_name: "Ada Lovelace", years_old: 30 },
      [
        { sourceField: "full_name", targetField: "customerName" },
        { sourceField: "years_old", targetField: "customerAge" },
      ],
    );

    expect(result).toEqual({ customerName: "Ada Lovelace", customerAge: 30 });
    expect(events.published.map((e) => e.kind)).toEqual(["FieldsMapped"]);
  });

  it("applies a transform function when one is supplied for a target field", async () => {
    const service = new DomainMappingService(new FixedClock(new Date()), new SequentialIdGenerator());

    const result = await service.map(
      { years_old: "30" },
      [{ sourceField: "years_old", targetField: "customerAge" }],
      { customerAge: (value) => Number(value) },
    );

    expect(result.customerAge).toBe(30);
  });

  it("throws InvalidFieldMappingError when the source field doesn't exist", async () => {
    const service = new DomainMappingService(new FixedClock(new Date()), new SequentialIdGenerator());
    await expect(service.map({}, [{ sourceField: "missing", targetField: "x" }])).rejects.toThrow(InvalidFieldMappingError);
  });
});
