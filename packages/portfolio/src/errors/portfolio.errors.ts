import { DomainError } from "@rmsm/core";

export abstract class PortfolioDomainError extends DomainError {}

export class InvalidPortfolioError extends PortfolioDomainError {
  constructor(reason: string) {
    super(`Invalid portfolio: ${reason}`, "INVALID_PORTFOLIO");
  }
}

export class InvalidPositionError extends PortfolioDomainError {
  constructor(reason: string) {
    super(`Invalid position: ${reason}`, "INVALID_POSITION");
  }
}

export class InvalidHoldingError extends PortfolioDomainError {
  constructor(reason: string) {
    super(`Invalid holding: ${reason}`, "INVALID_HOLDING");
  }
}

export class InvalidTradeError extends PortfolioDomainError {
  constructor(reason: string) {
    super(`Invalid trade: ${reason}`, "INVALID_TRADE");
  }
}

export class InvalidBalanceError extends PortfolioDomainError {
  constructor(reason: string) {
    super(`Invalid balance operation: ${reason}`, "INVALID_BALANCE");
  }
}

export class UnknownPortfolioError extends PortfolioDomainError {
  constructor(portfolioId: string) {
    super(`Portfolio "${portfolioId}" is not known.`, "UNKNOWN_PORTFOLIO");
  }
}

export class UnknownPositionError extends PortfolioDomainError {
  constructor(positionId: string) {
    super(`Position "${positionId}" is not known.`, "UNKNOWN_POSITION");
  }
}

export class DrawdownLimitExceededError extends PortfolioDomainError {
  constructor(currentDrawdownPct: number, limitPct: number) {
    super(`Drawdown ${currentDrawdownPct.toFixed(2)}% exceeds the configured limit of ${limitPct.toFixed(2)}%.`, "DRAWDOWN_LIMIT_EXCEEDED");
  }
}
