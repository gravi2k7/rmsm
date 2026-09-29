export type BrokerProvider = "MT5" | "CTRADER" | "PROJECTX";

export type BrokerConnectionStatus = "ACTIVE" | "INACTIVE" | "ERROR";

export interface BrokerConnection {
  id: string;
  organizationId: string;
  provider: BrokerProvider;
  name: string;
  status: BrokerConnectionStatus;
  lastConnectionTestAt: string | null;
  lastConnectionTestStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrokerConnectionInput {
  provider: BrokerProvider;
  name: string;
  username?: string;
  apiKey?: string;
  login?: string;
  password?: string;
  server?: string;
}

export interface BrokerAccount {
  id: string;
  name: string;
  balance?: number;
  canTrade: boolean;
  currency?: string;
}

export interface BrokerConnectionTestResult {
  success: boolean;
  message: string;
  brokerAccountId?: string;
  accounts: BrokerAccount[];
}
