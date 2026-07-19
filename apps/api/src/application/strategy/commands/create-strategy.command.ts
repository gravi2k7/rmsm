import type { CreateStrategyDto } from "../dto/create-strategy.dto";

export class CreateStrategyCommand {
  constructor(public readonly dto: CreateStrategyDto) {}
}
