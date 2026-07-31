import type { BrokerTick, BrokerOrderResult, BrokerPosition, BrokerAccountInfo, BrokerSubscription } from "./broker-models";

/** BR-001's Streaming Service section: Live Tick Updates, Order Updates, Position Updates, Account Updates — "implement event-driven subscriptions." Each `subscribe*` method returns a `BrokerSubscription` handle rather than exposing an EventEmitter directly, keeping the streaming transport (WebSocket, in MetaTrader5Client's case) fully encapsulated behind this interface, per BR-001's "the provider must be easily replaceable" spirit (echoing MD-004's same instruction for Yahoo Finance). */
export interface BrokerStreamingService {
  subscribeTicks(symbols: string[], handler: (tick: BrokerTick) => void): BrokerSubscription;
  subscribeOrderUpdates(handler: (order: BrokerOrderResult) => void): BrokerSubscription;
  subscribePositionUpdates(handler: (position: BrokerPosition) => void): BrokerSubscription;
  subscribeAccountUpdates(handler: (account: BrokerAccountInfo) => void): BrokerSubscription;
}
