import { Injectable } from "@nestjs/common";
import type { Portfolio, Position, Trade } from "@rmsm/portfolio";
import { PortfolioResponseDto, PositionResponseDto, TradeResponseDto } from "../dto/portfolio.dto";

@Injectable()
export class PortfolioMapper {
  toPortfolioDto(portfolio: Portfolio): PortfolioResponseDto {
    const dto = new PortfolioResponseDto();
    dto.id = portfolio.id;
    dto.cashBalance = portfolio.cashBalance;
    // "Equity" here is cash-only (no unrealized P&L folded in) — that
    // needs live prices via `PortfolioCalculator`/`PortfolioService.getCurrentEquity()`,
    // which this read-only mapper has no access to and shouldn't reach
    // for itself. A caller wanting live mark-to-market equity should use
    // that service method directly, not this DTO's own `equity` field.
    dto.equity = portfolio.cashBalance;
    dto.buyingPower = portfolio.buyingPower;
    dto.marginUsed = portfolio.marginUsed;
    dto.marginAvailable = portfolio.marginAvailable;
    dto.openPositionCount = portfolio.openPositions.length;
    dto.closedPositionCount = portfolio.closedPositions.length;
    dto.createdAt = portfolio.createdAt.toISOString();
    return dto;
  }

  toPositionDto(position: Position): PositionResponseDto {
    const dto = new PositionResponseDto();
    dto.id = position.id;
    dto.symbolCode = position.symbolCode.value;
    dto.side = position.side;
    dto.status = position.status;
    dto.quantityUnits = position.quantityUnits;
    dto.averageEntryPrice = position.averageEntryPrice;
    dto.averageExitPrice = position.averageExitPrice;
    dto.realizedPnl = position.realizedPnl;
    dto.openedAt = position.openedAt.toISOString();
    dto.closedAt = position.closedAt?.toISOString();
    return dto;
  }

  toPositionDtoList(positions: readonly Position[]): PositionResponseDto[] {
    return positions.map((p) => this.toPositionDto(p));
  }

  toTradeDto(trade: Trade): TradeResponseDto {
    const dto = new TradeResponseDto();
    dto.id = trade.id;
    dto.symbolCode = trade.symbolCode.value;
    dto.side = trade.side;
    dto.quantityUnits = trade.quantityUnits;
    dto.entryPrice = trade.entryPrice;
    dto.exitPrice = trade.exitPrice;
    dto.realizedPnl = trade.realizedPnl;
    dto.isWin = trade.isWin();
    dto.openedAt = trade.openedAt.toISOString();
    dto.closedAt = trade.closedAt.toISOString();
    return dto;
  }

  toTradeDtoList(trades: readonly Trade[]): TradeResponseDto[] {
    return trades.map((t) => this.toTradeDto(t));
  }
}
