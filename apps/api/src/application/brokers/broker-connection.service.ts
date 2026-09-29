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
import type { Env } from "@rmsm/config";
import { getMetaTrader5Config } from "@rmsm/config";
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
import { MetaTrader5Adapter } from "../../infrastructure/brokers/mt5/mt5.adapter";
import { TradovateClient } from "../../infrastructure/brokers/tradovate/tradovate.client";
import { TradovateAdapter } from "../../infrastructure/brokers/tradovate/tradovate.adapter";
import type { TradovateCredentials } from "../../infrastructure/brokers/tradovate/tradovate.types";
import type { MetaTrader5Credentials } from "../../infrastructure/brokers/mt5/mt5.client";
import { APP_CONFIG } from "../../config/app-config.module";
import { Mt5WorkerService } from "./mt5-worker.service";

type ProjectXCredentials = {
  username: string;
  apiKey: string;
  baseUrl?: string;
};

type StoredMt5Credentials = MetaTrader5Credentials;
type StoredTradovateCredentials = TradovateCredentials;

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
    @Inject(APP_CONFIG)
    private readonly config: Env,
    private readonly mt5WorkerService: Mt5WorkerService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateBrokerConnectionDto,
  ): Promise<BrokerConnectionPublic> {
    let credentials:
      | ProjectXCredentials
      | StoredMt5Credentials
      | StoredTradovateCredentials;

    switch (dto.provider) {
      case BrokerProvider.PROJECTX:
        if (!dto.username || !dto.apiKey) {
          throw new BadRequestException(
            "ProjectX username and API key are required.",
          );
        }

        credentials = {
          username: dto.username,
          apiKey: dto.apiKey,
          ...(dto.baseUrl ? { baseUrl: dto.baseUrl } : {}),
        };
        break;

      case BrokerProvider.MT5:
        if (!dto.login || !dto.password || !dto.server) {
          throw new BadRequestException(
            "MT5 login, password, and server are required.",
          );
        }

        credentials = {
          login: dto.login,
          password: dto.password,
          server: dto.server,
        };
        break;

      case BrokerProvider.TRADOVATE:
        if (!dto.username || !dto.password) {
          throw new BadRequestException(
            "Tradovate username and password are required.",
          );
        }

        credentials = {
          username: dto.username,
          password: dto.password,
          ...(dto.baseUrl ? { baseUrl: dto.baseUrl } : {}),
        };
        break;

      default:
        throw new BadRequestException(
          `Broker provider ${dto.provider} is not implemented yet.`,
        );
    }

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

    const testedAt = new Date();
    let assignedWorkerId: string | null = null;
    let assignedWorkerHere = false;

    try {
      let connectionForTest = connection;

      if (connection.provider === BrokerProvider.MT5) {
        const assignment =
          await this.ensureMt5Worker(connection);

        connectionForTest = assignment.connection;

        if (assignment.assigned) {
          assignedWorkerId =
            assignment.connection.mt5WorkerId;
          assignedWorkerHere = true;
        }
      }

      const adapter =
        await this.createAdapter(connectionForTest);

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

      if (assignedWorkerHere && assignedWorkerId) {
        await this.repository.releaseMt5Worker(
          organizationId,
          id,
          assignedWorkerId,
        );
      }

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

    const adapter = await this.createAdapter(connection);

    if (connection.provider === BrokerProvider.MT5) {
      await adapter.testConnection();
    }

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

    let connectionForExecution = connection;

    if (connection.provider === BrokerProvider.MT5) {
      const assignment =
        await this.ensureMt5Worker(connection);

      connectionForExecution = assignment.connection;
    }

    const adapter =
      await this.createAdapter(connectionForExecution);

    if (connection.provider === BrokerProvider.MT5) {
      await adapter.testConnection();
    }

    return adapter;
  }

  private async ensureMt5Worker(
    connection: BrokerConnection,
  ): Promise<{
    connection: BrokerConnection;
    assigned: boolean;
  }> {
    if (connection.provider !== BrokerProvider.MT5) {
      return {
        connection,
        assigned: false,
      };
    }

    if (connection.mt5WorkerId) {
      return {
        connection,
        assigned: false,
      };
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const worker =
        await this.mt5WorkerService.getAvailableWorker();

      const result =
        await this.repository.tryAssignMt5Worker(
          connection.organizationId,
          connection.id,
          worker.id,
        );

      if (!result) {
        continue;
      }

      return result;
    }

    throw new BadRequestException(
      "Unable to assign an MT5 worker to this broker connection.",
    );
  }

  private async createAdapter(
    connection: BrokerConnection,
  ): Promise<BrokerAdapter> {
    switch (connection.provider) {
      case BrokerProvider.PROJECTX: {
        const credentials =
          this.encryption.decrypt<ProjectXCredentials>(
            connection.credentialsEnc,
          );

        return new ProjectXAdapter(new ProjectXClient(credentials));
      }

      case BrokerProvider.MT5: {
        const credentials =
          this.encryption.decrypt<StoredMt5Credentials>(
            connection.credentialsEnc,
          );

        if (!connection.mt5WorkerId) {
          throw new BadRequestException(
            "MT5 broker connection has no assigned worker.",
          );
        }

        const execution =
          await this.mt5WorkerService.getExecutionWorkerCredentials(
            connection.mt5WorkerId,
          );

        const mt5Config = getMetaTrader5Config(this.config);

        return MetaTrader5Adapter.fromCredentials(credentials, {
          gatewayUrl: execution.worker.gatewayUrl,
          gatewaySecret: execution.gatewaySecret,
          timeoutMs: mt5Config.timeoutMs,
          maxRetry: mt5Config.maxRetry,
          heartbeatSeconds: mt5Config.heartbeatSeconds,
        });
      }

      case BrokerProvider.TRADOVATE: {
        const credentials =
          this.encryption.decrypt<StoredTradovateCredentials>(
            connection.credentialsEnc,
          );

        const client = new TradovateClient(credentials);

        return new TradovateAdapter(
          client,
          credentials,
        );
      }

      default:
        throw new Error(
          `Broker provider ${connection.provider} is not implemented yet.`,
        );
    }
  }
}
