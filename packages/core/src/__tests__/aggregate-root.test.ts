import { describe, expect, it } from "vitest";
import { AggregateRoot } from "../entities";
import type { DomainEvent } from "../events";

interface RenamedEvent extends DomainEvent {
  kind: "Renamed";
  newName: string;
}

class NamedThing extends AggregateRoot<string> {
  private name: string;

  constructor(id: string, name: string) {
    super(id);
    this.name = name;
  }

  rename(newName: string): void {
    this.name = newName;
    const event: RenamedEvent = {
      eventId: `evt-${Math.random()}`,
      kind: "Renamed",
      occurredAt: new Date(),
      aggregateId: this.id,
      newName,
    };
    this.addDomainEvent(event);
  }

  getName(): string {
    return this.name;
  }
}

describe("AggregateRoot", () => {
  it("records no events until an operation raises one", () => {
    const thing = new NamedThing("id-1", "original");
    expect(thing.pullDomainEvents()).toHaveLength(0);
  });

  it("records an event when a method raises one", () => {
    const thing = new NamedThing("id-1", "original");
    thing.rename("updated");

    const events = thing.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "Renamed", newName: "updated", aggregateId: "id-1" });
  });

  it("pulling events clears them — a second pull returns nothing new", () => {
    const thing = new NamedThing("id-1", "original");
    thing.rename("updated");

    thing.pullDomainEvents();
    expect(thing.pullDomainEvents()).toHaveLength(0);
  });

  it("accumulates multiple events across multiple operations before a pull", () => {
    const thing = new NamedThing("id-1", "original");
    thing.rename("second");
    thing.rename("third");

    const events = thing.pullDomainEvents();
    expect(events).toHaveLength(2);
    expect(events.map((e) => (e as RenamedEvent).newName)).toEqual(["second", "third"]);
  });

  it("is still an Entity — identity equality applies", () => {
    const a = new NamedThing("id-1", "x");
    const b = new NamedThing("id-1", "y");
    expect(a.equals(b)).toBe(true);
  });
});
