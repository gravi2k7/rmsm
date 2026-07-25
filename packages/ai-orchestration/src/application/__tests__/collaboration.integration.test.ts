import { describe, expect, it } from "vitest";
import { WorkerRegistryService } from "../services/worker-registry.service";
import { DelegationService } from "../services/delegation.service";
import { SharedContextService } from "../services/shared-context.service";
import { MessagingService } from "../services/messaging.service";
import { InMemoryWorkerRegistry } from "../../infrastructure/in-memory-worker.registry";
import { InMemoryDelegationRepository } from "../../infrastructure/in-memory-delegation.repository";
import { InMemorySharedContextStore } from "../../infrastructure/in-memory-shared-context.store";
import { InMemoryMessageBus } from "../../infrastructure/in-memory-message.bus";
import { DelegationStatus } from "../../domain/enums/orchestration.enum";
import { SystemLikeClock, SequentialIdGenerator, ScriptedWorkerExecutor } from "./fakes";

/** "Agent collaboration": a coordinator delegates a task to a worker,
 * the worker's outcome is written to shared context, and the
 * coordinator is notified over the message bus — three AI-405
 * capabilities (delegation, shared context, messaging) working
 * together in one flow, not three isolated unit tests. */
describe("multi-agent collaboration (delegation + shared context + messaging)", () => {
  it("completes a full coordinator/worker collaboration round-trip", async () => {
    const clock = new SystemLikeClock();
    const idGenerator = new SequentialIdGenerator();
    const sharedRegistry = new InMemoryWorkerRegistry();

    const workerRegistry = new WorkerRegistryService(sharedRegistry, clock, idGenerator);
    await workerRegistry.registerWorker("worker-1", ["research"]);

    const executor = new ScriptedWorkerExecutor(new Set());
    const delegation = new DelegationService(sharedRegistry, new InMemoryDelegationRepository(), executor, clock, idGenerator);

    const sharedContext = new SharedContextService(new InMemorySharedContextStore(), clock, idGenerator);
    const messaging = new MessagingService(new InMemoryMessageBus(), clock, idGenerator);

    const coordinatorInbox: unknown[] = [];
    messaging.subscribe("coordinator-1", (message) => {
      coordinatorInbox.push(message.content);
    });

    const task = await delegation.delegate("coordinator-1", { id: "goal-1", description: "gather market data" }, "research");
    expect(task.status).toBe(DelegationStatus.COMPLETED);

    await sharedContext.share(`delegation:${task.id}:result`, task.result, task.workerId);
    await messaging.send(task.workerId, "coordinator-1", { delegationId: task.id, status: task.status });

    expect(await sharedContext.read(`delegation:${task.id}:result`)).toBe("handled: gather market data");
    expect(coordinatorInbox).toEqual([{ delegationId: task.id, status: DelegationStatus.COMPLETED }]);
  });
});
