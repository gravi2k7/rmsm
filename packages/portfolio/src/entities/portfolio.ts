import { AggregateRoot, Guard } from "@rmsm/core";
import { Position } from "./position";
import { Balance, type BalanceEntryType } from "./balance";
import { PortfolioCreatedEvent } from "../events/portfolio-created.event";
import { PositionOpenedEvent } from "../events/position-opened.event";
import { PositionClosedEvent } from "../events/position-closed.event";
import { PortfolioUpdatedEvent } from "../events/portfolio-updated.event";
import { DrawdownLimitEvent } from "../events/drawdown-limit.event";
import { InvalidPortfolioError, UnknownPositionError } from "../errors/portfolio.errors";

export interface PortfolioProps {
  cashBalance: number;
  marginUsed: number;
  positions: Position[];
  balanceHistory: Balance[];
  /** The highest equity value this portfolio has ever recorded — the
   * reference point `checkDrawdown()` compares against. Tracked on the
   * aggregate itself (not recomputed from `Equity` history each time)
   * because it only ever needs to move in one direction (up), making it
   * cheap to maintain incrementally. */
  peakEquity: number;
  readonly createdAt: Date;
}

/**
 * A trading account's own state after trades are executed — cash
 * balance, margin, and every open/closed `Position`. Aggregate root:
 * opening/closing a position and crossing a drawdown limit are all real
 * domain events other parts of the system (a risk monitor, a strategy
 * service) need to react to.
 *
 * `buyingPower` and `marginAvailable` are computed from `cashBalance`/
 * `marginUsed` rather than stored separately, so they can never drift
 * out of sync with the numbers that actually determine them.
 */
export class Portfolio extends AggregateRoot<string> {
  private props: PortfolioProps;

  private constructor(id: string, props: PortfolioProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, initialCashBalance: number, occurredAt: Date = new Date()): Portfolio {
    Guard.againstEmptyString(id, "id");
    Guard.ensure(initialCashBalance >= 0, "initialCashBalance must not be negative.");

    const portfolio = new Portfolio(id, {
      cashBalance: initialCashBalance,
      marginUsed: 0,
      positions: [],
      balanceHistory: [],
      peakEquity: initialCashBalance,
      createdAt: occurredAt,
    });
    portfolio.addDomainEvent(new PortfolioCreatedEvent(id, occurredAt));
    return portfolio;
  }

  get cashBalance(): number {
    return this.props.cashBalance;
  }

  get marginUsed(): number {
    return this.props.marginUsed;
  }

  /** Cash not currently committed as margin — the simplest honest
   * definition available without live leverage/instrument data this
   * aggregate doesn't hold; a real buying-power calculation involving
   * leverage multipliers belongs in a service that has that data, not
   * hardcoded here. */
  get buyingPower(): number {
    return Math.max(0, this.props.cashBalance - this.props.marginUsed);
  }

  get marginAvailable(): number {
    return this.buyingPower;
  }

  get positions(): readonly Position[] {
    return this.props.positions;
  }

  get openPositions(): readonly Position[] {
    return this.props.positions.filter((p) => p.status === "OPEN");
  }

  get closedPositions(): readonly Position[] {
    return this.props.positions.filter((p) => p.status === "CLOSED");
  }

  get balanceHistory(): readonly Balance[] {
    return this.props.balanceHistory;
  }

  get peakEquity(): number {
    return this.props.peakEquity;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  private recordBalanceEntry(type: BalanceEntryType, amount: number, occurredAt: Date): void {
    const resultingBalance = this.props.cashBalance + amount;
    const entry = Balance.record(`${this.id}-bal-${this.props.balanceHistory.length + 1}`, { type, amount, resultingBalance, occurredAt });
    this.props = { ...this.props, cashBalance: resultingBalance, balanceHistory: [...this.props.balanceHistory, entry] };
  }

  deposit(amount: number, occurredAt: Date = new Date()): void {
    Guard.ensure(amount > 0, "deposit amount must be positive.");
    this.recordBalanceEntry("DEPOSIT", amount, occurredAt);
    this.addDomainEvent(new PortfolioUpdatedEvent(this.id, occurredAt));
  }

  withdraw(amount: number, occurredAt: Date = new Date()): void {
    Guard.ensure(amount > 0, "withdrawal amount must be positive.");
    if (amount > this.buyingPower) {
      throw new InvalidPortfolioError(`cannot withdraw ${amount}: only ${this.buyingPower} is available (not committed as margin).`);
    }
    this.recordBalanceEntry("WITHDRAWAL", -amount, occurredAt);
    this.addDomainEvent(new PortfolioUpdatedEvent(this.id, occurredAt));
  }

  openPosition(position: Position, marginRequired: number, occurredAt: Date = new Date()): void {
    Guard.ensure(marginRequired >= 0, "marginRequired must not be negative.");
    if (marginRequired > this.buyingPower) {
      throw new InvalidPortfolioError(`cannot open position: margin required (${marginRequired}) exceeds available buying power (${this.buyingPower}).`);
    }
    this.props = { ...this.props, positions: [...this.props.positions, position], marginUsed: this.props.marginUsed + marginRequired };
    this.addDomainEvent(new PositionOpenedEvent(this.id, position.id, occurredAt));
  }

  /** Closes an open position at `exitPrice`, releases its own margin,
   * records its realized P&L as a `Balance` entry, and raises
   * `PositionClosedEvent`. */
  closePosition(positionId: string, exitPrice: number, marginReleased: number, occurredAt: Date = new Date()): void {
    const position = this.props.positions.find((p) => p.id === positionId);
    if (!position) throw new UnknownPositionError(positionId);

    position.close(exitPrice, occurredAt);
    const realizedPnl = position.realizedPnl ?? 0;

    this.props = { ...this.props, marginUsed: Math.max(0, this.props.marginUsed - marginReleased) };
    this.recordBalanceEntry("REALIZED_PNL", realizedPnl, occurredAt);
    this.addDomainEvent(new PositionClosedEvent(this.id, positionId, realizedPnl, occurredAt));
  }

  /** Checks `currentEquity` against this portfolio's own historical
   * peak, raising `DrawdownLimitEvent` if the resulting drawdown
   * percentage exceeds `limitPercentage`. Updates `peakEquity` first if
   * `currentEquity` is itself a new high — a new peak can never itself
   * be "in drawdown." Doesn't compute `currentEquity` itself (that needs
   * live prices this aggregate doesn't hold); a caller — typically
   * `RiskMonitorService`, via `PortfolioCalculator` — supplies it. */
  checkDrawdown(currentEquity: number, limitPercentage: number, occurredAt: Date = new Date()): void {
    if (currentEquity > this.props.peakEquity) {
      this.props = { ...this.props, peakEquity: currentEquity };
      return;
    }
    const drawdownPercentage = ((this.props.peakEquity - currentEquity) / this.props.peakEquity) * 100;
    if (drawdownPercentage > limitPercentage) {
      this.addDomainEvent(new DrawdownLimitEvent(this.id, drawdownPercentage, limitPercentage, occurredAt));
    }
  }
}
