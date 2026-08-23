import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CTraderCatalogSynchronizationDto {
  @ApiProperty({
    description: "RMSM market-data provider id for the cTrader connection.",
    example: "ctrader-provider-id",
  })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiPropertyOptional({
    description: "FIX SecurityList request timeout in milliseconds.",
    example: 30000,
    minimum: 1000,
    maximum: 120000,
    default: 30000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number;
}
