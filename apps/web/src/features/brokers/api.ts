import { api } from "@/lib/api-client";
import type {
  BrokerAccount,
  BrokerConnection,
  BrokerConnectionTestResult,
  CreateBrokerConnectionInput,
} from "./types";

const brokerConnectionsPath = (organizationId: string) =>
  `/organizations/${organizationId}/broker-connections`;

export function listBrokerConnections(
  organizationId: string,
): Promise<BrokerConnection[]> {
  return api.get<BrokerConnection[]>(
    brokerConnectionsPath(organizationId),
  );
}

export function createBrokerConnection(
  organizationId: string,
  input: CreateBrokerConnectionInput,
): Promise<BrokerConnection> {
  return api.post<BrokerConnection>(
    brokerConnectionsPath(organizationId),
    input,
  );
}

export function testBrokerConnection(
  organizationId: string,
  connectionId: string,
): Promise<BrokerConnectionTestResult> {
  return api.post<BrokerConnectionTestResult>(
    `${brokerConnectionsPath(organizationId)}/${connectionId}/test`,
  );
}

export type { BrokerAccount };
