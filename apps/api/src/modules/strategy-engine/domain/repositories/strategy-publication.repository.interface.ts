import type { StrategyPublication } from "../entities/strategy-publication.entity";

export interface StrategyPublicationRepository {
  findById(id: string, organizationId: string): Promise<StrategyPublication | null>;
  listByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<StrategyPublication[]>;
  save(publication: StrategyPublication): Promise<void>;
}
