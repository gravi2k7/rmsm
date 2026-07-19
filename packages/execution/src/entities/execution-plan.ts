import { Entity, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";
import { Quantity } from "../value-objects/quantity";
import type { OrderSide, OrderType } from "./order";

export type SplitStrategy = "SINGLE" | "TWAP" | "ICEBERG";

export interface ExecutionPlanProps {
  readonly decisionId: string;
  readonly symbolCode: SymbolCode;
  readonly side: OrderSide;
  readonly orderType: OrderType;
  readonly totalQuantity: Quantity;
  readonly splitStrategy: SplitStrategy;
  readonly maxRetries: number;
  readonly timeoutMs: number;
}

/**
 * How an approved `Decision` will actually be executed — routing/timing
 * strategy decided *before* any `Order`/`Execution` exists. `splitStrategy`
 * names the strategy only (`"TWAP"`, `"ICEBERG"`); this domain doesn't
 * implement the actual scheduling/slicing algorithm those imply — that's
 * real execution infrastructure, out of this pure-domain package's own
 * scope (same "no infrastructure code" boundary every other decision in
 * this package respects).
 */
export class ExecutionPlan extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: ExecutionPlanProps,
  ) {
    super(id);
  }

  static create(id: string, props: ExecutionPlanProps): ExecutionPlan {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.decisionId, "decisionId");
    Guard.ensure(props.maxRetries >= 0, "maxRetries must not be negative.");
    Guard.ensure(props.timeoutMs > 0, "timeoutMs must be positive.");
    return new ExecutionPlan(id, props);
  }

  get decisionId(): string {
    return this.props.decisionId;
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get side(): OrderSide {
    return this.props.side;
  }

  get orderType(): OrderType {
    return this.props.orderType;
  }

  get totalQuantity(): Quantity {
    return this.props.totalQuantity;
  }

  get splitStrategy(): SplitStrategy {
    return this.props.splitStrategy;
  }

  get maxRetries(): number {
    return this.props.maxRetries;
  }

  get timeoutMs(): number {
    return this.props.timeoutMs;
  }
}
