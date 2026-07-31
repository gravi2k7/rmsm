import type { BrokerPosition } from "./broker-models";

/** BR-001's Position Service section: Open Positions, Closed Positions, Position Details, Floating Profit, Swap, Commission (all fields on `BrokerPosition`). "Closed Positions" is deliberately NOT here — a closed position is a completed trade, which BR-001's own History Service (Deal History) already covers; duplicating it here would be exactly the kind of redundant abstraction BR-001's "No Duplicate Code" standard rules out. */
export interface BrokerPositionService {
  listOpenPositions(): Promise<BrokerPosition[]>;
  getPosition(positionId: string): Promise<BrokerPosition>;
}
