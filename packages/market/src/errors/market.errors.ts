import { DomainError } from "@rmsm/core";

/** Base for every error this domain raises — extends `@rmsm/core`'s own
 * `DomainError` (no `statusCode`; HTTP mapping is an application-layer
 * concern this domain package has no knowledge of — it has no REST/
 * infrastructure code at all, per this package's own design rules). */
export abstract class MarketDomainError extends DomainError {}

export class InvalidSymbolCodeError extends MarketDomainError {
  constructor(code: string, reason: string) {
    super(`Invalid symbol code "${code}": ${reason}`, "INVALID_SYMBOL_CODE");
  }
}

export class InvalidPriceError extends MarketDomainError {
  constructor(reason: string) {
    super(`Invalid price: ${reason}`, "INVALID_PRICE");
  }
}

export class InvalidVolumeError extends MarketDomainError {
  constructor(reason: string) {
    super(`Invalid volume: ${reason}`, "INVALID_VOLUME");
  }
}

export class InvalidSpreadError extends MarketDomainError {
  constructor(reason: string) {
    super(`Invalid spread: ${reason}`, "INVALID_SPREAD");
  }
}

export class InvalidCandleError extends MarketDomainError {
  constructor(reason: string) {
    super(`Invalid candle: ${reason}`, "INVALID_CANDLE");
  }
}

export class InvalidTimeframeError extends MarketDomainError {
  constructor(value: string) {
    super(`"${value}" is not a supported timeframe.`, "INVALID_TIMEFRAME");
  }
}

export class MarketClosedError extends MarketDomainError {
  constructor(exchangeName: string) {
    super(`${exchangeName} is currently closed.`, "MARKET_CLOSED");
  }
}

export class UnknownExchangeError extends MarketDomainError {
  constructor(exchangeId: string) {
    super(`Exchange "${exchangeId}" is not known to this domain.`, "UNKNOWN_EXCHANGE");
  }
}

export class UnknownSymbolError extends MarketDomainError {
  constructor(symbolCode: string) {
    super(`Symbol "${symbolCode}" is not known to this domain.`, "UNKNOWN_SYMBOL");
  }
}

export class UnknownSessionError extends MarketDomainError {
  constructor(sessionType: string) {
    super(`Session "${sessionType}" is not known to this domain.`, "UNKNOWN_SESSION");
  }
}

export class CurrencyMismatchError extends MarketDomainError {
  constructor(reason: string) {
    super(`Currency mismatch: ${reason}`, "CURRENCY_MISMATCH");
  }
}
