import type { WorkerRegistry } from "../repositories/worker-registry.interface";
import type { WorkerAgentDescriptor } from "../domain/entities/worker-agent-descriptor.entity";
import { DuplicateWorkerError } from "../domain/errors/orchestration-domain.errors";

export class InMemoryWorkerRegistry implements WorkerRegistry {
  private readonly byId = new Map<string, WorkerAgentDescriptor>();
  private readonly registrationOrder: string[] = [];

  async register(descriptor: WorkerAgentDescriptor): Promise<void> {
    if (this.byId.has(descriptor.agentId)) {
      throw new DuplicateWorkerError(descriptor.agentId);
    }
    this.byId.set(descriptor.agentId, descriptor);
    this.registrationOrder.push(descriptor.agentId);
  }

  async get(agentId: string): Promise<WorkerAgentDescriptor | null> {
    return this.byId.get(agentId) ?? null;
  }

  async findByCapability(capability: string): Promise<readonly WorkerAgentDescriptor[]> {
    return this.registrationOrder
      .map((agentId) => this.byId.get(agentId) as WorkerAgentDescriptor)
      .filter((descriptor) => descriptor.capabilities.includes(capability));
  }
}
