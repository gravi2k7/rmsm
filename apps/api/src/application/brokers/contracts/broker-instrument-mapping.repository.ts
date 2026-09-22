import type { BrokerInstrumentMapping } from "@rmsm/database";

export interface BrokerInstrumentMappingRepository {
  findByConnectionAndInstrument(
    brokerConnectionId: string,
    instrumentId: string,
  ): Promise<BrokerInstrumentMapping | null>;

  findByConnectionAndBrokerInstrument(
    brokerConnectionId: string,
    brokerInstrumentId: string,
  ): Promise<BrokerInstrumentMapping | null>;
}
