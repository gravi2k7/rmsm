import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AssetClass } from "@rmsm/database";

export class InstrumentProviderSearchResultDto {
  @ApiProperty()
  providerSymbol!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: [
    "EQUITY",
    "ETF",
    "CRYPTO",
    "FOREX",
    "COMMODITY",
    "INDEX",
    "BOND",
    "OPTION",
    "FUTURE",
  ]})
  assetClass!: AssetClass;

  @ApiPropertyOptional()
  exchangeCode?: string;

  @ApiPropertyOptional()
  currency?: string;
}
