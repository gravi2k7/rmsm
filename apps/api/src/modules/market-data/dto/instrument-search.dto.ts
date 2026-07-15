import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

const ASSET_CLASS_VALUES = ["EQUITY", "ETF", "CRYPTO", "FOREX", "COMMODITY", "INDEX", "BOND", "OPTION", "FUTURE"] as const;
const INSTRUMENT_STATUS_VALUES = ["ACTIVE", "SUSPENDED", "DELISTED", "PENDING"] as const;

export class InstrumentSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: ASSET_CLASS_VALUES })
  @IsOptional()
  @IsEnum(ASSET_CLASS_VALUES)
  assetClass?: (typeof ASSET_CLASS_VALUES)[number];

  @ApiPropertyOptional({ enum: INSTRUMENT_STATUS_VALUES })
  @IsOptional()
  @IsEnum(INSTRUMENT_STATUS_VALUES)
  status?: (typeof INSTRUMENT_STATUS_VALUES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exchangeId?: string;
}
