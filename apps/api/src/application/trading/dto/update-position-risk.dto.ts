import { IsDecimal, IsOptional } from "class-validator";

export class UpdatePositionRiskDto {
  @IsOptional()
  @IsDecimal()
  stopLossPrice?: string | null;

  @IsOptional()
  @IsDecimal()
  takeProfitPrice?: string | null;
}
