import { ApiProperty } from "@nestjs/swagger";

export class ExchangeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() country!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() type!: string;
  @ApiProperty() isOpen!: boolean;
}

export class SymbolResponseDto {
  @ApiProperty() code!: string;
  @ApiProperty() description!: string;
  @ApiProperty() baseCurrency!: string;
  @ApiProperty() quoteCurrency!: string;
  @ApiProperty() precision!: number;
  @ApiProperty() exchangeId!: string;
  @ApiProperty() assetClass!: string;
  @ApiProperty() instrumentType!: string;
}

export class CandleResponseDto {
  @ApiProperty() symbolCode!: string;
  @ApiProperty() timeframe!: string;
  @ApiProperty() timestamp!: string;
  @ApiProperty() open!: number;
  @ApiProperty() high!: number;
  @ApiProperty() low!: number;
  @ApiProperty() close!: number;
  @ApiProperty() volume!: number;
  @ApiProperty() isComplete!: boolean;
}

export class ExchangeListResponseDto {
  @ApiProperty({ type: [ExchangeResponseDto] }) items!: ExchangeResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class SymbolListResponseDto {
  @ApiProperty({ type: [SymbolResponseDto] }) items!: SymbolResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class CandleListResponseDto {
  @ApiProperty({ type: [CandleResponseDto] }) items!: CandleResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
