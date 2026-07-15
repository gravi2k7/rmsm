import { ApiProperty } from "@nestjs/swagger";
import type { MarketDataSource } from "@rmsm/database";

export class TickResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() instrumentId!: string;
  @ApiProperty() price!: string;
  @ApiProperty() size!: string;
  @ApiProperty() eventTime!: Date;
  @ApiProperty() providerId!: string;
  @ApiProperty() source!: MarketDataSource;
}
