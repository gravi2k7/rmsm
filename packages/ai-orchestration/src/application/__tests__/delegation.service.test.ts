import { describe, expect, it } from "vitest";
import { DelegationService } from "../services/delegation.service";
import { InMemoryWorkerRegistry } from "../../infrastructure/in-memory-worker.registry";
import { InMemoryDelegationRepository } from "../../infrastructure/in-memory-delegation.repository";
import { DelegationStatus } from "../../domain/enums/orchestration.enum";
import { NoEligibleWorkerError, DelegationNotFoundError } from "../../domain/errors/orchestration-domain.errors";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher, ScriptedWorkerExecutor } from "./fakes";

async function registryWithWorkers(...workerIds: string[]) {
  const registry = new InMemoryWorkerRegistry();
  for (const id of workerIds) {
    await registry.register({ agentId: id, capabilities: ["research"] });
  }
  return registry;
}

describe("DelegationService", () => {
  it("delegates to the first eligible worker and completes on success", async () => {
    const registry = await registryWithWorkers("worker-1", "worker-2");
    const repository = new InMemoryDelegationRepository();
    const executor = new ScriptedWorkerExecutor(new Set());
    const events = new RecordingEventPublisher();
    const service = new DelegationService(registry, repository, executor, new SystemLikeClock(), new SequentialIdGenerator(), events);

    const task = await service.delegate("coordinator-1", { id: "goal-1", description: "find sources" }, "research");

    expect(task.status).toBe(DelegationStatus.COMPLETED);
    expect(task.workerId).toBe("worker-1");
    expect(executor.attempts).toEqual(["worker-1"]);
    expect(events.published.map((e) => e.kind)).toEqual(["TaskDelegated", "DelegationCompleted"]);
  });

  it("recovers from a failing worker by reassigning to the next eligible one", async () => {
    const registry = await registryWithWorkers("worker-1", "worker-2");
    const repository = new InMemoryDelegationRepository();
    const executor = new ScriptedWorkerExecutor(new Set(["worker-1"]));
    const events = new RecordingEventPublisher();
    const service = new DelegationService(registry, repository, executor, new SystemLikeClock(), new SequentialIdGenerator(), events);

    const task = await service.delegate("coordinator-1", { id: "goal-1", description: "find sources" }, "research");

    expect(task.status).toBe(DelegationStatus.COMPLETED);
    expect(task.workerId).toBe("worker-2");
    expect(task.reassignedFromWorkerId).toBe("worker-1");
    expect(task.attempts).toBe(2);
    expect(executor.attempts).toEqual(["worker-1", "worker-2"]);
    expect(events.published.map((e) => e.kind)).toEqual(["TaskDelegated", "DelegationReassigned", "DelegationCompleted"]);
  });

  it("marks the delegation FAILED once every eligible worker has failed", async () => {
    const registry = await registryWithWorkers("worker-1", "worker-2");
    const repository = new InMemoryDelegationRepository();
    const executor = new ScriptedWorkerExecutor(new Set(["worker-1", "worker-2"]));
    const service = new DelegationService(registry, repository, executor, new SystemLikeClock(), new SequentialIdGenerator());

    const task = await service.delegate("coordinator-1", { id: "goal-1", description: "find sources" }, "research");

    expect(task.status).toBe(DelegationStatus.FAILED);
    expect(task.error).toContain("worker-2");
    const persisted = await service.getDelegation(task.id);
    expect(persisted.status).toBe(DelegationStatus.FAILED);
  });

  it("throws NoEligibleWorkerError when no worker has the required capability", async () => {
    const registry = new InMemoryWorkerRegistry();
    const repository = new InMemoryDelegationRepository();
    const executor = new ScriptedWorkerExecutor(new Set());
    const service = new DelegationService(registry, repository, executor, new SystemLikeClock(), new SequentialIdGenerator());

    await expect(service.delegate("coordinator-1", { id: "goal-1", description: "x" }, "translation")).rejects.toThrow(NoEligibleWorkerError);
  });

  it("throws DelegationNotFoundError for an unknown delegation id", async () => {
    const registry = new InMemoryWorkerRegistry();
    const repository = new InMemoryDelegationRepository();
    const executor = new ScriptedWorkerExecutor(new Set());
    const service = new DelegationService(registry, repository, executor, new SystemLikeClock(), new SequentialIdGenerator());

    await expect(service.getDelegation("missing")).rejects.toThrow(DelegationNotFoundError);
  });
});
