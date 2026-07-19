import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsString, IsPositive, Max, MaxLength, Min, MinLength } from "class-validator";
import { Timeframe } from "@rmsm/market";

const RISK_TOLERANCES = ["LOW", "MEDIUM", "HIGH"] as const;

export class CreateStrategyDto {
  @ApiProperty({ example: "MA Crossover" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: "Buys when the fast MA crosses above the slow MA." })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ enum: RISK_TOLERANCES })
  @IsEnum(RISK_TOLERANCES)
  riskTolerance!: "LOW" | "MEDIUM" | "HIGH";

  @ApiProperty({ example: 0.02, description: "Fraction of account equity risked per trade (0-1)." })
  @IsNumber()
  @Min(0.0001)
  @Max(1)
  maxRiskPerTrade!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  maxLeverage!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @IsPositive()
  maxOpenPositions!: number;

  @ApiProperty({ enum: Timeframe, example: Timeframe.H1 })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @ApiProperty({ example: ["EURUSD", "GBPUSD"], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  supportedSymbols!: string[];
}
