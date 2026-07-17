import { Injectable } from "@nestjs/common";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { StrategyNotFoundException } from "../errors/application.errors";

export class GetStrategyQuery {
  constructor(
    public readonly organizationId: string,
    public readonly strategyId: string,
  ) {}
}

@Injectable()
export class GetStrategyHandler {
  constructor(private readonly strategyRepository: StrategyRepository) {}

  async execute(query: GetStrategyQuery): Promise<Strategy> {
    const strategy = await this.strategyRepository.findById(query.strategyId, query.organizationId);
    if (!strategy) {
      throw new StrategyNotFoundException(`No strategy "${query.strategyId}" in this organization.`, { strategyId: query.strategyId });
    }
    return strategy;
  }
}
