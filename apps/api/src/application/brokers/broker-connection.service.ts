import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BrokerConnectionStatus,
  BrokerProvider,
  type BrokerConnection,
} from "@rmsm/database";
import type {
  BrokerAdapter,
  BrokerAccount,
} from "./contracts/broker-adapter";
import type { BrokerConnectionRepository } from "./contracts/broker-connection.repository";
import { BROKER_CONNECTION_REPOSITORY } from "./broker-connection.tokens";
import { BrokerCredentialsEncryptionService } from "./security/broker-credentials-encryption.service";
import type { CreateBrokerConnectionDto } from "./dto/create-broker-connection.dto";
import type { BindBrokerAccountDto } from "./dto/bind-broker-account.dto";
import { TRADING_ACCOUNT_REPOSITORY } from "../trading/trading.tokens";
import type { TradingAccountRepository } from "../trading/trading.repository";
import { ProjectXClient } from "../../infrastructure/brokers/projectx/projectx.client";
import { ProjectXAdapter } from "../../infrastructure/brokers/projectx/projectx.adapter";

type ProjectXCredentials = {
  username: string;
  apiKey: string;
  baseUrl?: string;
};

export interface BrokerConnectionPublic {
  id: string;
  organizationId: string;
  provider: BrokerProvider;
  name: string;
  status: BrokerConnectionStatus;
  lastConnectionTestAt: Date | null;
  lastConnectionTestStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toPublicConnection = (
  connection: BrokerConnection,
): BrokerConnectionPublic => ({
  id: connection.id,
  organizationId: connection.organizationId,
  provider: connection.provider,
  name: connection.name,
  status: connection.status,
  lastConnectionTestAt: connection.lastConnectionTestAt,
  lastConnectionTestStatus: connection.lastConnectionTestStatus,
  createdAt: connection.createdAt,
  updatedAt: connection.updatedAt,
});

@Injectable()
export class BrokerConnectionService {
  constructor(
    @Inject(BROKER_CONNECTION_REPOSITORY)
    private readonly repository: BrokerConnectionRepository,
    private readonly encryption: BrokerCredentialsEncryptionService,
    @Inject(TRADING_ACCOUNT_REPOSITORY)
    private readonly tradingAccountRepository: TradingAccountRepository,
  ) {}

  async create(
    organizationId: string,
    dto: CreateBrokerConnectionDto,
  ): Promise<BrokerConnectionPublic> {
    if (dto.provider !== BrokerProvider.PROJECTX) {
      throw new Error(
        `Broker provider ${dto.provider} is not implemented yet.`,
      );
    }

    const credentials: ProjectXCredentials = {
      username: dto.username,
      apiKey: dto.apiKey,
      ...(dto.baseUrl ? { baseUrl: dto.baseUrl } : {}),
    };

    const connection = await this.repository.create({
      organizationId,
      provider: dto.provider,
      name: dto.name,
      credentialsEnc: this.encryption.encrypt(credentials),
    });

    return toPublicConnection(connection);
  }

  async list(
    organizationId: string,
  ): Promise<BrokerConnectionPublic[]> {
    const connections = await this.repository.listByOrganization(
      organizationId,
    );

    return connections.map(toPublicConnection);
  }

  async test(
    organizationId: string,
    id: string,
  ): Promise<{
    success: boolean;
    message: string;
    brokerAccountId?: string;
    accounts: BrokerAccount[];
  }> {
    const connection = await this.repository.findById(organizationId, id);

    if (!connection) {
      throw new NotFoundException("Broker connection not found.");
    }

    const adapter = this.createAdapter(connection);
    const testedAt = new Date();

    try {
      const result = await adapter.testConnection();
      const accounts = await adapter.getAccounts();

      await this.repository.updateStatus(
        organizationId,
        id,
        result.success
          ? BrokerConnectionStatus.ACTIVE
          : BrokerConnectionStatus.ERROR,
        testedAt,
        result.message,
      );

      return {
        ...result,
        accounts,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Broker connection failed.";

      await this.repository.updateStatus(
        organizationId,
        id,
        BrokerConnectionStatus.ERROR,
        testedAt,
        message,
      );

      throw error;
    }
  }

  async bindAccount(
    organizationId: string,
    ownerUserId: string,
    connectionId: string,
    dto: BindBrokerAccountDto,
  ): Promise<BrokerConnectionPublic & {
    tradingAccountId: string;
    brokerAccountId: string;
  }> {
    const connection = await this.repository.findById(
      organizationId,
      connectionId,
    );

    if (!connection) {
      throw new NotFoundException("Broker connection not found.");
    }

    if (connection.status !== BrokerConnectionStatus.ACTIVE) {
      throw new BadRequestException(
        "Broker connection must be active before an account can be bound.",
      );
    }

    const tradingAccount =
      await this.tradingAccountRepository.findById(
        organizationId,
        ownerUserId,
        dto.tradingAccountId,
      );

    if (!tradingAccount) {
      throw new NotFoundException("Trading account not found.");
    }

    const adapter = this.createAdapter(connection);
    const accounts = await adapter.getAccounts();

    const brokerAccount = accounts.find(
      (account) => String(account.id) === String(dto.brokerAccountId),
    );

    if (!brokerAccount) {
      throw new BadRequestException(
        "Broker account was not found on the selected broker connection.",
      );
    }

    if (!brokerAccount.canTrade) {
      throw new BadRequestException(
        "The selected broker account is not tradable.",
      );
    }

    const updated =
      await this.tradingAccountRepository.bindBroker(
        organizationId,
        ownerUserId,
        tradingAccount.id,
        connection.id,
        String(brokerAccount.id),
      );

    return {
      ...toPublicConnection(connection),
      tradingAccountId: updated.id,
      brokerAccountId: String(brokerAccount.id),
    };
  }

  async getAdapterForExecution(
    organizationId: string,
    connectionId: string,
  ): Promise<BrokerAdapter> {
    const connection = await this.repository.findById(
      organizationId,
      connectionId,
    );

    if (!connection) {
      throw new NotFoundException("Broker connection not found.");
    }

    if (connection.status !== BrokerConnectionStatus.ACTIVE) {
      throw new BadRequestException(
        "Broker connection must be active before execution.",
      );
    }

    return this.createAdapter(connection);
  }

  private createAdapter(connection: BrokerConnection): BrokerAdapter {
    switch (connection.provider) {
      case BrokerProvider.PROJECTX: {
        const credentials =
          this.encryption.decrypt<ProjectXCredentials>(
            connection.credentialsEnc,
          );

        return new ProjectXAdapter(new ProjectXClient(credentials));
      }

      default:
        throw new Error(
          `Broker provider ${connection.provider} is not implemented yet.`,
        );
    }
  }
}
