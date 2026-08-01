import { Injectable } from "@nestjs/common";
import { prisma, DbClient, MarketDataProviderType, AssetClass } from "@rmsm/database";
import { MarketDataProviderConfigModel } from "../interfaces/models/reference-data.models";
import { toMarketDataProviderConfigModel } from "./mappers/reference-data.mappers";

export interface CreateMarketDataProviderConfigInput {
  type: MarketDataProviderType;
  name: string;
  baseUrl?: string;
  credentialReference?: string;
  rateLimitPerMinute?: number;
  supportedAssetClasses?: AssetClass[];
  createdById?: string;
}

/**
 * Repository Pattern — single-table (`market_data_provider_configs`), zero
 * business logic. Returns MarketDataProviderConfigModel (a domain model),
 * never the Prisma-generated `MarketDataProviderConfig` type — the
 * explicit AI-101 Phase 2A instruction (ADR-025), a deliberate departure
 * from every EP module's repository convention. Every method funnels its
 * Prisma result through `toMarketDataProviderConfigModel()`
 * (repositories/mappers/reference-data.mappers.ts) before returning.
 */
@Injectable()
export class MarketDataProviderConfigRepository {
  async create(data: CreateMarketDataProviderConfigInput, client: DbClient = prisma): Promise<MarketDataProviderConfigModel> {
    const row = await client.marketDataProviderConfig.create({ data: { ...data, updatedById: data.createdById } });
    return toMarketDataProviderConfigModel(row);
  }

  async findById(id: string, client: DbClient = prisma): Promise<MarketDataProviderConfigModel | null> {
    const row = await client.marketDataProviderConfig.findUnique({ where: { id } });
    return row ? toMarketDataProviderConfigModel(row) : null;
  }

  async findByType(type: MarketDataProviderType, client: DbClient = prisma): Promise<MarketDataProviderConfigModel | null> {
    const row = await client.marketDataProviderConfig.findFirst({ where: { type, isActive: true } });
    return row ? toMarketDataProviderConfigModel(row) : null;
  }

  async listActive(client: DbClient = prisma): Promise<MarketDataProviderConfigModel[]> {
    const rows = await client.marketDataProviderConfig.findMany({ where: { isActive: true } });
    return rows.map(toMarketDataProviderConfigModel);
  }

  async deactivate(id: string, client: DbClient = prisma): Promise<MarketDataProviderConfigModel> {
    const row = await client.marketDataProviderConfig.update({ where: { id }, data: { isActive: false } });
    return toMarketDataProviderConfigModel(row);
  }

  /** FIP-001 "Provider priority" — resolution-order tiebreak read by ProviderFailoverService; lower runs first. */
  async updatePriority(id: string, priority: number, updatedById: string | undefined, client: DbClient = prisma): Promise<MarketDataProviderConfigModel> {
    const row = await client.marketDataProviderConfig.update({ where: { id }, data: { priority, updatedById } });
    return toMarketDataProviderConfigModel(row);
  }

  /** FIP-001 "Connection testing" — ProviderCredentialService's own record of the last on-demand test result. Never stores the credential itself, only the pass/fail outcome. */
  async recordConnectionTest(id: string, status: "SUCCESS" | "FAILURE", client: DbClient = prisma): Promise<MarketDataProviderConfigModel> {
    const row = await client.marketDataProviderConfig.update({
      where: { id },
      data: { lastConnectionTestAt: new Date(), lastConnectionTestStatus: status },
    });
    return toMarketDataProviderConfigModel(row);
  }

  /** All active configs ordered by priority — ProviderFailoverService's own candidate-ordering query. */
  async listActiveByPriority(client: DbClient = prisma): Promise<MarketDataProviderConfigModel[]> {
    const rows = await client.marketDataProviderConfig.findMany({ where: { isActive: true }, orderBy: { priority: "asc" } });
    return rows.map(toMarketDataProviderConfigModel);
  }
}
