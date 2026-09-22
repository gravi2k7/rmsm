import type {
  BrokerConnection,
  BrokerConnectionStatus,
  BrokerProvider,
} from "@rmsm/database";

export interface CreateBrokerConnectionInput {
  organizationId: string;
  provider: BrokerProvider;
  name: string;
  credentialsEnc: string;
}

export interface BrokerConnectionRepository {
  create(input: CreateBrokerConnectionInput): Promise<BrokerConnection>;
  listByOrganization(organizationId: string): Promise<BrokerConnection[]>;
  findById(
    organizationId: string,
    id: string,
  ): Promise<BrokerConnection | null>;
  updateStatus(
    organizationId: string,
    id: string,
    status: BrokerConnectionStatus,
    lastConnectionTestAt: Date,
    lastConnectionTestStatus: string,
  ): Promise<BrokerConnection>;
}
