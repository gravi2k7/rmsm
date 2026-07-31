import { Injectable } from "@nestjs/common";
import type { BrokerRiskService } from "../../interfaces/broker-risk-service.interface";
import type { BrokerMarginCalculationRequest, BrokerMarginResult, BrokerPositionSizeRequest, BrokerOrderRequest, BrokerRiskValidation } from "../../interfaces/broker-models";
import { MetaTrader5Client } from "./metatrader5.client";

/**
 * BR-001's Risk Service section: Margin Calculation, Position Size,
 * Required Margin, Stop Out Level, Risk Validation. Every one of these
 * is delegated to the gateway's own `/risk/*` endpoints rather than
 * reimplemented client-side — margin formulas, stop-out levels, and
 * position-sizing rules genuinely differ per account type, instrument,
 * and even per-broker leverage tier; only the broker (via the gateway,
 * which itself talks to the real MT5 terminal/Manager API) has the
 * authoritative inputs to compute them correctly. Reimplementing that
 * math in RMSM would risk silently drifting from what the broker would
 * actually enforce at order time — exactly the kind of "duplicate,
 * possibly-wrong logic" BR-001's own "No Duplicate Code" standard warns
 * against, applied here to broker-side business rules rather than to
 * RMSM's own code.
 */
@Injectable()
export class MetaTrader5RiskService implements BrokerRiskService {
  constructor(private readonly client: MetaTrader5Client) {}

  async calculateMargin(request: BrokerMarginCalculationRequest): Promise<BrokerMarginResult> {
    return this.client.request<BrokerMarginResult>("POST", "/risk/margin", request);
  }

  async calculatePositionSize(request: BrokerPositionSizeRequest): Promise<number> {
    const result = await this.client.request<{ positionSize: number }>("POST", "/risk/position-size", request);
    return result.positionSize;
  }

  async validateOrder(request: BrokerOrderRequest): Promise<BrokerRiskValidation> {
    return this.client.request<BrokerRiskValidation>("POST", "/risk/validate", request);
  }
}
