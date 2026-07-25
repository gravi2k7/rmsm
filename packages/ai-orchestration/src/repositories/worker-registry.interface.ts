import type { WorkerAgentDescriptor } from "../domain/entities/worker-agent-descriptor.entity";

export interface WorkerRegistry {
  register(descriptor: WorkerAgentDescriptor): Promise<void>;
  get(agentId: string): Promise<WorkerAgentDescriptor | null>;
  findByCapability(capability: string): Promise<readonly WorkerAgentDescriptor[]>;
}
