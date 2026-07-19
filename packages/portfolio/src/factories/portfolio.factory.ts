import { ok, err, type Result, InvariantViolationError } from "@rmsm/core";
import { randomUUID } from "node:crypto";
import { SymbolCode } from "@rmsm/market";
import { Portfolio } from "../entities/portfolio";
import { Position, type PositionSide } from "../entities/position";
import { InvalidPortfolioError, type PortfolioDomainError } from "../errors/portfolio.errors";

export interface RawPortfolioInput {
  readonly id?: string;
  readonly initialCashBalance: number;
}

export interface RawPositionInput {
  readonly id?: string;
  readonly symbolCode: string;
  readonly side: PositionSide;
  readonly quantityUnits: number;
  readonly entryPrice: number;
}

/** Builds a `Portfolio` or a `Position` from raw primitive input — the
 * same fail-fast, aggregated-`Result` composition pattern every other
 * domain package's own factory in this platform uses. */
export class PortfolioFactory {
  static createPortfolio(input: RawPortfolioInput): Result<Portfolio, PortfolioDomainError> {
    try {
      return ok(Portfolio.create(input.id ?? randomUUID(), input.initialCashBalance));
    } catch (error) {
      if (error instanceof InvalidPortfolioError) return err(error);
      // Portfolio.create() also uses @rmsm/core's Guard.ensure() for its
      // own construction-time invariants (e.g. a negative initial
      // balance), which throws Guard's own InvariantViolationError, not
      // this package's InvalidPortfolioError. Converted here rather than
      // leaking @rmsm/core's error type through this domain's own
      // Result-based public API.
      if (error instanceof InvariantViolationError) return err(new InvalidPortfolioError(error.message));
      throw error;
    }
  }

  static createPosition(input: RawPositionInput): Result<Position, PortfolioDomainError> {
    const symbolCode = SymbolCode.create(input.symbolCode);
    if (!symbolCode.ok) return symbolCode;

    const position = Position.open(input.id ?? randomUUID(), {
      symbolCode: symbolCode.value,
      side: input.side,
      quantityUnits: input.quantityUnits,
      averageEntryPrice: input.entryPrice,
      openedAt: new Date(),
    });

    return ok(position);
  }
}
