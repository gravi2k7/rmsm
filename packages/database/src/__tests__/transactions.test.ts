import { describe, expect, it, vi } from "vitest";
import { TransactionManager } from "../transactions/transaction.manager";
import { UnitOfWork } from "../transactions/unit-of-work";
import type { AggregateRoot, DomainEvent } from "@rmsm/core";
import type { PrismaClient } from "@prisma/client";

function fakePrismaClient(): PrismaClient {
  return {
    $transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn("fake-tx-client")),
  } as unknown as PrismaClient;
}

describe("TransactionManager", () => {
  it("runs the callback with the transactional client and returns its result", async () => {
    const prisma = fakePrismaClient();
    const manager = new TransactionManager(prisma);

    const result = await manager.run(async (client) => {
      expect(client).toBe("fake-tx-client");
      return 42;
    });

    expect(result).toBe(42);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("passes through maxWait/timeout/isolationLevel options", async () => {
    const prisma = fakePrismaClient();
    const manager = new TransactionManager(prisma);

    await manager.run(async () => undefined, { maxWaitMs: 1000, timeoutMs: 5000, isolationLevel: "Serializable" });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 1000,
      timeout: 5000,
      isolationLevel: "Serializable",
    });
  });

  it("propagates an error thrown inside the callback", async () => {
    const prisma = fakePrismaClient();
    const manager = new TransactionManager(prisma);

    await expect(
      manager.run(async () => {
        throw new Error("rollback me");
      }),
    ).rejects.toThrow("rollback me");
  });
});

class TestAggregate implements Pick<AggregateRoot<string>, "pullDomainEvents"> {
  private events: DomainEvent[] = [];
  constructor(private readonly id: string) {}

  raise(kind: string): void {
    this.events.push({ eventId: `${this.id}-${kind}`, kind, occurredAt: new Date(), aggregateId: this.id });
  }

  pullDomainEvents(): readonly DomainEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}

describe("UnitOfWork", () => {
  it("runs every registered operation inside one transaction", async () => {
    const prisma = fakePrismaClient();
    const manager = new TransactionManager(prisma);
    const uow = new UnitOfWork();
    const calls: string[] = [];

    uow.register(async () => {
      calls.push("op1");
    });
    uow.register(async () => {
      calls.push("op2");
    });

    await uow.commit(manager);

    expect(calls).toEqual(["op1", "op2"]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("collects domain events from tracked aggregates only after commit", async () => {
    const prisma = fakePrismaClient();
    const manager = new TransactionManager(prisma);
    const uow = new UnitOfWork();
    const aggregate = new TestAggregate("agg-1");
    aggregate.raise("Created");

    uow.trackForEvents(aggregate as unknown as AggregateRoot<string>);
    uow.register(async () => undefined);

    const events = await uow.commit(manager);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "Created", aggregateId: "agg-1" });
  });

  it("does not collect events if the transaction throws", async () => {
    const prisma = {
      $transaction: vi.fn(async () => {
        throw new Error("db down");
      }),
    } as unknown as PrismaClient;
    const manager = new TransactionManager(prisma);
    const uow = new UnitOfWork();
    const aggregate = new TestAggregate("agg-1");
    aggregate.raise("ShouldNotBePublished");
    uow.trackForEvents(aggregate as unknown as AggregateRoot<string>);

    await expect(uow.commit(manager)).rejects.toThrow("db down");
    // the aggregate's own events are still sitting unpulled — a caller
    // inspecting it directly would see them, but commit() never returned them
    expect(aggregate.pullDomainEvents()).toHaveLength(1);
  });

  it("clears its own state after commit — safe to reuse for a second batch", async () => {
    const prisma = fakePrismaClient();
    const manager = new TransactionManager(prisma);
    const uow = new UnitOfWork();
    let callCount = 0;
    uow.register(async () => {
      callCount++;
    });

    await uow.commit(manager);
    await uow.commit(manager); // second commit — should run zero registered ops, not the first batch again

    expect(callCount).toBe(1);
  });
});
