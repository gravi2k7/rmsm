import { Injectable } from "@nestjs/common";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";

export class ListVersionsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly strategyId: string,
  ) {}
}

@Injectable()
export class ListVersionsHandler {
  constructor(private readonly versionRepository: StrategyVersionRepository) {}

  async execute(query: ListVersionsQuery): Promise<StrategyVersion[]> {
    return this.versionRepository.listByStrategy(query.strategyId, query.organizationId);
  }
}
