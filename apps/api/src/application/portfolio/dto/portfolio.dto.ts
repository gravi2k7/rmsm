import { ApiProperty } from "@nestjs/swagger";

export class PortfolioResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() cashBalance!: number;
  @ApiProperty() equity!: number;
  @ApiProperty() buyingPower!: number;
  @ApiProperty() marginUsed!: number;
  @ApiProperty() marginAvailable!: number;
  @ApiProperty() openPositionCount!: number;
  @ApiProperty() closedPositionCount!: number;
  @ApiProperty() createdAt!: string;
}

export class PositionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() symbolCode!: string;
  @ApiProperty({ enum: ["LONG", "SHORT"] }) side!: string;
  @ApiProperty({ enum: ["OPEN", "CLOSED"] }) status!: string;
  @ApiProperty() quantityUnits!: number;
  @ApiProperty() averageEntryPrice!: number;
  @ApiProperty({ required: false }) averageExitPrice?: number;
  @ApiProperty({ required: false }) realizedPnl?: number;
  @ApiProperty() openedAt!: string;
  @ApiProperty({ required: false }) closedAt?: string;
}

export class TradeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() symbolCode!: string;
  @ApiProperty({ enum: ["LONG", "SHORT"] }) side!: string;
  @ApiProperty() quantityUnits!: number;
  @ApiProperty() entryPrice!: number;
  @ApiProperty() exitPrice!: number;
  @ApiProperty() realizedPnl!: number;
  @ApiProperty() isWin!: boolean;
  @ApiProperty() openedAt!: string;
  @ApiProperty() closedAt!: string;
}

export class PositionListResponseDto {
  @ApiProperty({ type: [PositionResponseDto] }) items!: PositionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class TradeListResponseDto {
  @ApiProperty({ type: [TradeResponseDto] }) items!: TradeResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
