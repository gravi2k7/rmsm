import type { Clock, IdGenerator } from "@rmsm/core";
import type { WorkerRegistry } from "../../repositories/worker-registry.interface";
import type { WorkerAgentDescriptor } from "../../domain/entities/worker-agent-descriptor.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { WorkerRegisteredEvent } from "../../events/orchestration-domain-events.interface";

/** The "worker agents" capability's application-layer face: registering
 * workers and discovering which ones are eligible for a given
 * capability, on top of the `WorkerRegistry` port. */
export class WorkerRegistryService {
  constructor(
    private readonly registry: WorkerRegistry,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async registerWorker(agentId: string, capabilities: readonly string[]): Promise<WorkerAgentDescriptor> {
    const descriptor: WorkerAgentDescriptor = { agentId, capabilities };
    await this.registry.register(descriptor);

    const event: WorkerRegisteredEvent = {
      eventId: this.idGenerator.generate(),
      kind: "WorkerRegistered",
      occurredAt: this.clock.now(),
      aggregateId: agentId,
      workerId: agentId,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
    return descriptor;
  }

  async findEligibleWorkers(capability: string): Promise<readonly WorkerAgentDescriptor[]> {
    return this.registry.findByCapability(capability);
  }
}
