import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { MarketDataSource } from "@rmsm/database";

export class QuoteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() instrumentId!: string;
  @ApiPropertyOptional() bidPrice?: string | null;
  @ApiPropertyOptional() askPrice?: string | null;
  @ApiPropertyOptional() lastPrice?: string | null;
  @ApiPropertyOptional() bidSize?: string | null;
  @ApiPropertyOptional() askSize?: string | null;
  @ApiProperty() eventTime!: Date;
  @ApiProperty() providerId!: string;
  @ApiProperty() source!: MarketDataSource;
}
