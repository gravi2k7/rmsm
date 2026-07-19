import type { CreateOrderDto } from "../dto/execution.dto";

export class CreateOrderCommand {
  constructor(public readonly dto: CreateOrderDto) {}
}
