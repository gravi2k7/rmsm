import type { BrokerMarginCalculationRequest, BrokerMarginResult, BrokerPositionSizeRequest, BrokerOrderRequest, BrokerRiskValidation } from "./broker-models";

/** BR-001's Risk Service section: Margin Calculation, Position Size, Required Margin (both fields on `BrokerMarginResult`), Stop Out Level (part of `validateOrder`'s check against the account's current margin level), Risk Validation. */
export interface BrokerRiskService {
  calculateMargin(request: BrokerMarginCalculationRequest): Promise<BrokerMarginResult>;
  calculatePositionSize(request: BrokerPositionSizeRequest): Promise<number>;
  validateOrder(request: BrokerOrderRequest): Promise<BrokerRiskValidation>;
}
