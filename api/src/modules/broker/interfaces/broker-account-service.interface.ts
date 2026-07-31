import type { BrokerAccountInfo } from "./broker-models";

/** BR-001's Account Service section, verbatim: Account Number, Account Name, Balance, Equity, Margin, Free Margin, Margin Level, Currency, Leverage — all on `BrokerAccountInfo`. */
export interface BrokerAccountService {
  getAccountInfo(): Promise<BrokerAccountInfo>;
}
