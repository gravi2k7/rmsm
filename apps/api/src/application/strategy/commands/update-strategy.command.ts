import type { UpdateStrategyDto } from "../dto/update-strategy.dto";

export class UpdateStrategyCommand {
  constructor(
    public readonly strategyId: string,
    public readonly dto: UpdateStrategyDto,
  ) {}
}
