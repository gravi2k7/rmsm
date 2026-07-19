import { ApiProperty } from "@nestjs/swagger";

export class StrategyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ["DRAFT", "TESTING", "PAPER_TRADING", "PRODUCTION", "ARCHIVED"] })
  status!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ enum: ["LOW", "MEDIUM", "HIGH"] })
  riskTolerance!: string;

  @ApiProperty()
  maxRiskPerTrade!: number;

  @ApiProperty()
  maxLeverage!: number;

  @ApiProperty()
  maxOpenPositions!: number;

  @ApiProperty()
  timeframe!: string;

  @ApiProperty({ type: [String] })
  supportedSymbols!: string[];

  @ApiProperty()
  versionCount!: number;
}
