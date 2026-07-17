import type { ExecutionProfile } from "../entities/execution-profile.entity";

export interface ExecutionProfileRepository {
  findById(id: string, organizationId: string): Promise<ExecutionProfile | null>;
  listByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<ExecutionProfile[]>;
  save(profile: ExecutionProfile): Promise<void>;
  delete(id: string, organizationId: string): Promise<void>;
}
