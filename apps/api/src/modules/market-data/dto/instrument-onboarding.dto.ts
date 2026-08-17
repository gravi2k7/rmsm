import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";
import type { AssetClass } from "@rmsm/database";

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

export class InstrumentOnboardingDto {
  @ApiProperty()
  @IsUUID()
  providerConfigId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 100)
  providerSymbol!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty({ enum: ASSET_CLASS_VALUES })
  @IsEnum(ASSET_CLASS_VALUES)
  assetClass!: AssetClass;

  @ApiProperty()
  @IsString()
  @Length(1, 20)
  currency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 50)
  exchangeCode?: string;
}
