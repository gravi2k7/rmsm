import { Injectable } from "@nestjs/common";
import type { Order, Execution } from "@rmsm/execution";
import { OrderResponseDto, ExecutionResponseDto } from "../dto/execution.dto";

@Injectable()
export class ExecutionMapper {
  toOrderDto(order: Order): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.decisionId = order.decisionId;
    dto.symbolCode = order.symbolCode.value;
    dto.side = order.side;
    dto.type = order.type;
    dto.status = order.status;
    dto.quantityUnits = order.quantity.units;
    dto.filledQuantityUnits = order.filledQuantityUnits;
    dto.averageFillPrice = order.averageFillPrice;
    dto.limitPrice = order.limitPrice?.amount;
    dto.stopPrice = order.stopPrice?.amount;
    dto.createdAt = order.createdAt.toISOString();
    return dto;
  }

  toOrderDtoList(orders: readonly Order[]): OrderResponseDto[] {
    return orders.map((o) => this.toOrderDto(o));
  }

  toExecutionDto(execution: Execution): ExecutionResponseDto {
    const dto = new ExecutionResponseDto();
    dto.id = execution.id;
    dto.orderId = execution.orderId;
    dto.status = execution.status;
    dto.retryCount = execution.retryCount;
    dto.maxRetries = execution.maxRetries;
    dto.startedAt = execution.startedAt.toISOString();
    dto.completedAt = execution.completedAt?.toISOString();
    dto.failureReason = execution.failureReason;
    return dto;
  }

  toExecutionDtoList(executions: readonly Execution[]): ExecutionResponseDto[] {
    return executions.map((e) => this.toExecutionDto(e));
  }
}
