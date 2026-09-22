import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BrokerConnectionStatus,
  BrokerProvider,
  type BrokerInstrumentMapping,
} from "@rmsm/database";
import type { CreateBrokerInstrumentMappingDto } from "./dto/create-broker-instrument-mapping.dto";
import type { BrokerInstrumentMappingRepository } from "./contracts/broker-instrument-mapping.repository";
import type { BrokerConnectionRepository } from "./contracts/broker-connection.repository";
import { BROKER_CONNECTION_REPOSITORY } from "./broker-connection.tokens";
import { BROKER_INSTRUMENT_MAPPING_REPOSITORY } from "../trading/trading.tokens";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";
import { ProjectXClient } from "../../infrastructure/brokers/projectx/projectx.client";
import type { ProjectXContract } from "../../infrastructure/brokers/projectx/projectx.types";

type ProjectXCredentials = {
  username: string;
  apiKey: string;
  baseUrl?: string;
};

@Injectable()
export class BrokerInstrumentMappingService {
  constructor(
    @Inject(BROKER_INSTRUMENT_MAPPING_REPOSITORY)
    private readonly mappingRepository: BrokerInstrumentMappingRepository,
    @Inject(BROKER_CONNECTION_REPOSITORY)
    private readonly connectionRepository: BrokerConnectionRepository,
    private readonly encryption: BrokerCredentialsEncryptionService,
  ) {}

  async list(
    organizationId: string,
    connectionId: string,
  ): Promise<BrokerInstrumentMapping[]> {
    await this.requireConnection(organizationId, connectionId);
    return this.mappingRepository.listByConnection(connectionId);
  }

  async create(
    organizationId: string,
    connectionId: string,
    dto: CreateBrokerInstrumentMappingDto,
  ): Promise<BrokerInstrumentMapping> {
    await this.requireConnection(organizationId, connectionId);

    const existingInstrument =
      await this.mappingRepository.findByConnectionAndInstrument(
        connectionId,
        dto.instrumentId,
      );

    if (existingInstrument) {
      throw new ConflictException(
        "A mapping already exists for this RMSM instrument.",
      );
    }

    const existingBrokerInstrument =
      await this.mappingRepository.findByConnectionAndBrokerInstrument(
        connectionId,
        dto.brokerInstrumentId,
      );

    if (existingBrokerInstrument) {
      throw new ConflictException(
        "A mapping already exists for this broker instrument.",
      );
    }

    return this.mappingRepository.create({
      brokerConnectionId: connectionId,
      instrumentId: dto.instrumentId,
      brokerSymbol: dto.brokerSymbol.trim(),
      brokerInstrumentId: dto.brokerInstrumentId.trim(),
    });
  }

  async remove(
    organizationId: string,
    connectionId: string,
    id: string,
  ): Promise<void> {
    await this.requireConnection(organizationId, connectionId);
    await this.mappingRepository.delete(connectionId, id);
  }

  async discoverContracts(
    organizationId: string,
    connectionId: string,
    searchText?: string,
    live = false,
  ): Promise<ProjectXContract[]> {
    const connection = await this.requireConnection(
      organizationId,
      connectionId,
    );

    if (connection.provider !== BrokerProvider.PROJECTX) {
      throw new BadRequestException(
        "Contract discovery is currently implemented only for ProjectX.",
      );
    }

    const credentials =
      this.encryption.decrypt<ProjectXCredentials>(
        connection.credentialsEnc,
      );

    const client = new ProjectXClient(credentials);

    if (searchText?.trim()) {
      const response = await client.searchContracts(
        searchText.trim(),
        live,
      );
      return response.contracts;
    }

    const response = await client.getAvailableContracts(live);
    return response.contracts;
  }

  private async requireConnection(
    organizationId: string,
    connectionId: string,
  ) {
    const connection = await this.connectionRepository.findById(
      organizationId,
      connectionId,
    );

    if (!connection) {
      throw new NotFoundException("Broker connection not found.");
    }

    if (connection.status !== BrokerConnectionStatus.ACTIVE) {
      throw new BadRequestException(
        "Broker connection must be active.",
      );
    }

    return connection;
  }
}
