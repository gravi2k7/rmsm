import { describe, expect, it } from "vitest";
import { WorkerRegistryService } from "../services/worker-registry.service";
import { InMemoryWorkerRegistry } from "../../infrastructure/in-memory-worker.registry";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("WorkerRegistryService", () => {
  it("registers a worker and publishes WorkerRegistered", async () => {
    const events = new RecordingEventPublisher();
    const service = new WorkerRegistryService(new InMemoryWorkerRegistry(), new SystemLikeClock(), new SequentialIdGenerator(), events);

    const descriptor = await service.registerWorker("worker-1", ["research"]);
    expect(descriptor.capabilities).toEqual(["research"]);
    expect(events.published.map((e) => e.kind)).toEqual(["WorkerRegistered"]);
  });

  it("finds eligible workers by capability", async () => {
    const service = new WorkerRegistryService(new InMemoryWorkerRegistry(), new SystemLikeClock(), new SequentialIdGenerator());
    await service.registerWorker("worker-1", ["research"]);
    await service.registerWorker("worker-2", ["writing"]);

    const eligible = await service.findEligibleWorkers("research");
    expect(eligible.map((w) => w.agentId)).toEqual(["worker-1"]);
  });
});
