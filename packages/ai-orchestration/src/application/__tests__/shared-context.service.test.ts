import { describe, expect, it } from "vitest";
import { SharedContextService } from "../services/shared-context.service";
import { InMemorySharedContextStore } from "../../infrastructure/in-memory-shared-context.store";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("SharedContextService", () => {
  it("shares a value and makes it readable, publishing ContextShared", async () => {
    const events = new RecordingEventPublisher();
    const service = new SharedContextService(new InMemorySharedContextStore(), new SystemLikeClock(), new SequentialIdGenerator(), events);

    await service.share("plan", { step: 1 }, "coordinator-1");

    expect(await service.read("plan")).toEqual({ step: 1 });
    expect(await service.snapshot()).toEqual({ plan: { step: 1 } });
    expect(events.published.map((e) => e.kind)).toEqual(["ContextShared"]);
  });
});
