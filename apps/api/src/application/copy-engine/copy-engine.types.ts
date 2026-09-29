export const COPY_ENGINE_EVENTS = {
  ORDER_FILLED: "trading.order.filled",
} as const;

export interface CopyOrderFilledEvent {
  organizationId: string;
  sourceOrderId: string;
  accountId: string;
  instrumentId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  executionKind: "ENTRY" | "EXIT" | "REVERSAL";
  quantity: string;
  executedPrice: string;
  filledAt: Date;
}

export interface CopyRuleDecisionInput {
  executionKind: "ENTRY" | "EXIT" | "REVERSAL";
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  copyEntries: boolean;
  copyExits: boolean;
  copyLimitOrders: boolean;
  copyStopOrders: boolean;
}

export function shouldCopyOrder(
  input: CopyRuleDecisionInput,
): boolean {
  const executionAllowed =
    input.executionKind === "ENTRY"
      ? input.copyEntries
      : input.executionKind === "EXIT"
        ? input.copyExits
        : input.copyEntries && input.copyExits;

  if (!executionAllowed) {
    return false;
  }

  if (input.orderType === "LIMIT") {
    return input.copyLimitOrders;
  }

  if (
    input.orderType === "STOP" ||
    input.orderType === "STOP_LIMIT"
  ) {
    return input.copyStopOrders;
  }

  return true;
}

export interface CopyQuantityInput {
  sourceQuantity: string;
  quantityMultiplier: string;
  fixedQuantity?: string | null;
  maxQuantity?: string | null;
}

export function calculateCopyQuantity(input: CopyQuantityInput): string {
  const source = Number(input.sourceQuantity);
  const multiplier = Number(input.quantityMultiplier);

  if (!Number.isFinite(source) || source <= 0) {
    throw new Error("Source quantity must be greater than zero.");
  }

  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error("Quantity multiplier must be greater than zero.");
  }

  let quantity =
    input.fixedQuantity !== undefined && input.fixedQuantity !== null
      ? Number(input.fixedQuantity)
      : source * multiplier;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Calculated copy quantity must be greater than zero.");
  }

  if (input.maxQuantity !== undefined && input.maxQuantity !== null) {
    const maxQuantity = Number(input.maxQuantity);

    if (!Number.isFinite(maxQuantity) || maxQuantity <= 0) {
      throw new Error("Maximum quantity must be greater than zero.");
    }

    quantity = Math.min(quantity, maxQuantity);
  }

  return String(quantity);
}


export interface CopyRiskDecisionInput {
  executionKind: "ENTRY" | "EXIT" | "REVERSAL";
  requestedQuantity: string;
  existingPositionQuantity: string;
  maxPositionQuantity: string | null;
}

export interface CopyRiskDecision {
  allowed: boolean;
  quantity: string;
  reason?: string;
}

export function applyCopyPositionRisk(
  input: CopyRiskDecisionInput,
): CopyRiskDecision {
  const requested = Number(input.requestedQuantity);

  if (!Number.isFinite(requested) || requested <= 0) {
    return {
      allowed: false,
      quantity: "0",
      reason: "Invalid requested copy quantity.",
    };
  }

  if (input.executionKind === "EXIT") {
    return {
      allowed: true,
      quantity: input.requestedQuantity,
    };
  }

  if (input.maxPositionQuantity === null) {
    return {
      allowed: true,
      quantity: input.requestedQuantity,
    };
  }

  const maxPosition = Number(input.maxPositionQuantity);
  const existing = Number(input.existingPositionQuantity);

  if (
    !Number.isFinite(maxPosition) ||
    maxPosition <= 0 ||
    !Number.isFinite(existing) ||
    existing < 0
  ) {
    return {
      allowed: false,
      quantity: "0",
      reason: "Invalid position risk configuration.",
    };
  }

  const remainingCapacity = maxPosition - existing;

  if (remainingCapacity <= 0) {
    return {
      allowed: false,
      quantity: "0",
      reason: "Maximum position quantity reached.",
    };
  }

  if (remainingCapacity < requested) {
    if (input.executionKind === "REVERSAL") {
      return {
        allowed: false,
        quantity: "0",
        reason:
          "Reversal quantity exceeds maximum position quantity; partial reversal is not allowed.",
      };
    }

    return {
      allowed: true,
      quantity: String(remainingCapacity),
      reason: "Quantity capped by maximum position quantity.",
    };
  }

  return {
    allowed: true,
    quantity: input.requestedQuantity,
  };
}
