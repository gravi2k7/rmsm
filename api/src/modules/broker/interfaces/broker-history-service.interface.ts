import type { BrokerDateRange, BrokerOrderRecord, BrokerDealRecord } from "./broker-models";

/** BR-001's History Service section: Order History, Deal History, Trade History, with date filtering. "Trade History" is not a third method — it's the same concept as "Deal History" under MT5's own terminology (a "deal" IS an executed trade); implementing both would duplicate one concept under two names. */
export interface BrokerHistoryService {
  getOrderHistory(range: BrokerDateRange): Promise<BrokerOrderRecord[]>;
  getDealHistory(range: BrokerDateRange): Promise<BrokerDealRecord[]>;
}
