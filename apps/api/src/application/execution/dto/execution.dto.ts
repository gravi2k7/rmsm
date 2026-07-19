import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

const ORDER_SIDES = ["BUY", "SELL"] as const;
const ORDER_TYPES = ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] as const;

export class CreateOrderDto {
  @ApiProperty({ description: "The approved Decision this order executes." })
  @IsUUID()
  decisionId!: string;

  @ApiProperty({ example: "EURUSD" })
  @IsString()
  symbolCode!: string;

  @ApiProperty({ enum: ORDER_SIDES })
  @IsEnum(ORDER_SIDES)
  side!: "BUY" | "SELL";

  @ApiProperty({ enum: ORDER_TYPES })
  @IsEnum(ORDER_TYPES)
  type!: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @IsPositive()
  quantityUnits!: number;

  @ApiProperty({ required: false, description: "Required for LIMIT/STOP_LIMIT orders." })
  @IsOptional()
  @IsNumber()
  limitPrice?: number;

  @ApiProperty({ required: false, description: "Required for STOP/STOP_LIMIT orders." })
  @IsOptional()
  @IsNumber()
  stopPrice?: number;

  @ApiProperty({ example: 5, description: "Decimal places the given prices are quoted at." })
  @IsNumber()
  pricePrecision!: number;
}

export class OrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() decisionId!: string;
  @ApiProperty() symbolCode!: string;
  @ApiProperty() side!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ enum: ["PENDING", "SUBMITTED", "ACCEPTED", "PARTIALLY_FILLED", "FILLED", "CANCELLED", "REJECTED", "EXPIRED"] }) status!: string;
  @ApiProperty() quantityUnits!: number;
  @ApiProperty() filledQuantityUnits!: number;
  @ApiProperty({ required: false }) averageFillPrice?: number;
  @ApiProperty({ required: false }) limitPrice?: number;
  @ApiProperty({ required: false }) stopPrice?: number;
  @ApiProperty() createdAt!: string;
}

export class ExecutionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty({ enum: ["IN_PROGRESS", "COMPLETED", "FAILED"] }) status!: string;
  @ApiProperty() retryCount!: number;
  @ApiProperty() maxRetries!: number;
  @ApiProperty() startedAt!: string;
  @ApiProperty({ required: false }) completedAt?: string;
  @ApiProperty({ required: false }) failureReason?: string;
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) items!: OrderResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class ExecutionListResponseDto {
  @ApiProperty({ type: [ExecutionResponseDto] }) items!: ExecutionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
