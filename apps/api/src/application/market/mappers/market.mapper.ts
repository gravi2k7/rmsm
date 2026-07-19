import { Injectable } from "@nestjs/common";
import type { Exchange, MarketSymbol, Candle } from "@rmsm/market";
import { ExchangeResponseDto, SymbolResponseDto, CandleResponseDto } from "../dto/market-response.dto";

@Injectable()
export class MarketMapper {
  toExchangeDto(exchange: Exchange): ExchangeResponseDto {
    const dto = new ExchangeResponseDto();
    dto.id = exchange.id;
    dto.name = exchange.name;
    dto.country = exchange.country;
    dto.timezone = exchange.timezone;
    dto.type = exchange.type;
    dto.isOpen = exchange.isOpen;
    return dto;
  }

  toSymbolDto(symbol: MarketSymbol): SymbolResponseDto {
    const dto = new SymbolResponseDto();
    dto.code = symbol.code.value;
    dto.description = symbol.description;
    dto.baseCurrency = symbol.baseCurrency.value;
    dto.quoteCurrency = symbol.quoteCurrency.value;
    dto.precision = symbol.precision;
    dto.exchangeId = symbol.exchangeId;
    dto.assetClass = symbol.assetClass;
    dto.instrumentType = symbol.instrumentType;
    return dto;
  }

  toCandleDto(candle: Candle): CandleResponseDto {
    const dto = new CandleResponseDto();
    dto.symbolCode = candle.symbolCode.value;
    dto.timeframe = candle.timeframe;
    dto.timestamp = candle.timestamp.toISOString();
    dto.open = candle.open.amount;
    dto.high = candle.high.amount;
    dto.low = candle.low.amount;
    dto.close = candle.close.amount;
    dto.volume = candle.volume.units;
    dto.isComplete = candle.isComplete;
    return dto;
  }
}
