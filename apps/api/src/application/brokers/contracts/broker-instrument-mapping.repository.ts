import type { BrokerInstrumentMapping } from "@rmsm/database";

export interface CreateBrokerInstrumentMappingInput {
  brokerConnectionId: string;
  instrumentId: string;
  brokerSymbol: string;
  brokerInstrumentId: string;
}

export interface BrokerInstrumentMappingRepository {
  create(
    input: CreateBrokerInstrumentMappingInput,
  ): Promise<BrokerInstrumentMapping>;

  listByConnection(
    brokerConnectionId: string,
  ): Promise<BrokerInstrumentMapping[]>;

  findByConnectionAndInstrument(
    brokerConnectionId: string,
    instrumentId: string,
  ): Promise<BrokerInstrumentMapping | null>;

  findByConnectionAndBrokerInstrument(
    brokerConnectionId: string,
    brokerInstrumentId: string,
  ): Promise<BrokerInstrumentMapping | null>;

  delete(
    brokerConnectionId: string,
    id: string,
  ): Promise<void>;
}
