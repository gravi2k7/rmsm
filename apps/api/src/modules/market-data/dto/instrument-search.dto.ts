import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../utils/pagination.util";

const ASSET_CLASS_VALUES = [
  "EQUITY",
  "ETF",
  "CRYPTO",
  "FOREX",
  "COMMODITY",
  "INDEX",
  "BOND",
  "OPTION",
  "FUTURE",
] as const;

const INSTRUMENT_STATUS_VALUES = [
  "ACTIVE",
  "SUSPENDED",
  "DELISTED",
  "PENDING",
] as const;

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

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;
}
