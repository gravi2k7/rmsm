import type { StrategyValidation } from "../entities/strategy-validation.entity";

export interface StrategyValidationRepository {
  findById(id: string, organizationId: string): Promise<StrategyValidation | null>;
  listByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<StrategyValidation[]>;
  save(validation: StrategyValidation): Promise<void>;
}
