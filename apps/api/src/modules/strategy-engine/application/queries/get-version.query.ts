import { Injectable } from "@nestjs/common";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { StrategyVersionNotFoundException } from "../errors/application.errors";

export class GetVersionQuery {
  constructor(
    public readonly organizationId: string,
    public readonly strategyVersionId: string,
  ) {}
}

@Injectable()
export class GetVersionHandler {
  constructor(private readonly versionRepository: StrategyVersionRepository) {}

  async execute(query: GetVersionQuery): Promise<StrategyVersion> {
    const version = await this.versionRepository.findById(query.strategyVersionId, query.organizationId);
    if (!version) {
      throw new StrategyVersionNotFoundException(`No strategy version "${query.strategyVersionId}" in this organization.`, { strategyVersionId: query.strategyVersionId });
    }
    return version;
  }
}
