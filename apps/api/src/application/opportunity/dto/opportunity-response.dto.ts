import { ApiProperty } from "@nestjs/swagger";

export class OpportunityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() symbolCode!: string;
  @ApiProperty() strategyId!: string;
  @ApiProperty({ enum: ["PENDING", "CONFIRMED", "EXPIRED", "REJECTED"] }) status!: string;
  @ApiProperty({ enum: ["BUY", "SELL"] }) signalDirection!: string;
  @ApiProperty({ enum: ["WEAK", "MODERATE", "STRONG"] }) signalStrength!: string;
  @ApiProperty() confidenceScore!: number;
  @ApiProperty() trend!: string;
  @ApiProperty() volatility!: string;
  @ApiProperty() liquidity!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() expiresAt!: string;
}

export class OpportunityListResponseDto {
  @ApiProperty({ type: [OpportunityResponseDto] }) items!: OpportunityResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
