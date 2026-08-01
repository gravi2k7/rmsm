import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import Redis from "ioredis";
import { loadConfig } from "@rmsm/config";
import { QueueMonitoringService } from "./queue-monitoring.service";
import { MarketDataAdminService } from "../../market-data/services/market-data-admin.service";
import { AiGatewayService } from "../../ai/gateway/ai-gateway.service";

export interface ComponentHealth {
  component: string;
  status: "ok" | "degraded" | "error";
  detail?: string;
}

export interface HealthDashboard {
  overallStatus: "ok" | "degraded";
  components: ComponentHealth[];
  checkedAt: string;
}

/**
 * Domain 1's Health Dashboard, aggregating: Database Monitoring, Redis
 * Monitoring, Queue/Service Monitoring, AI Service Monitoring, and Market
 * Data provider health — one read-only composite over EXISTING health
 * signals each of those completed modules already exposes (Module 001's
 * DB/Redis liveness pattern, re-checked here the same way
 * HealthController does it — "independently reimplemented, not imported,"
 * this codebase's own established convention per BrokerHealthProvider's
 * doc comment — plus MarketDataAdminService.getSynchronizationHealth()
 * and AiGatewayService.checkProviderHealth(), both already real,
 * pre-existing methods this service only calls, never reimplements).
 * Broker (MetaTrader 5) health is intentionally NOT included here: its
 * `BrokerHealthProvider.checkHealth()` requires a live, per-connection
 * MT5 session and isn't exposed as a platform-wide singleton the way AI/
 * Market Data providers are — a named, deliberate scope boundary, not an
 * oversight.
 */
@Injectable()
export class HealthDashboardService {
  private readonly logger = new Logger(HealthDashboardService.name);

  constructor(
    private readonly queueMonitoring: QueueMonitoringService,
    private readonly marketDataAdminService: MarketDataAdminService,
    private readonly aiGatewayService: AiGatewayService,
  ) {}

  async getHealthDashboard(): Promise<HealthDashboard> {
    const components: ComponentHealth[] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueues(),
      this.checkMarketData(),
      this.checkAi("openai"),
      this.checkAi("ollama"),
    ]);

    const overallStatus = components.every((c) => c.status === "ok") ? "ok" : "degraded";
    return { overallStatus, components, checkedAt: new Date().toISOString() };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { component: "database", status: "ok" };
    } catch (error) {
      return { component: "database", status: "error", detail: error instanceof Error ? error.message : String(error) };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    try {
      const { REDIS_URL } = loadConfig();
      const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await redis.connect();
      await redis.ping();
      redis.disconnect();
      return { component: "redis", status: "ok" };
    } catch (error) {
      return { component: "redis", status: "error", detail: error instanceof Error ? error.message : String(error) };
    }
  }

  private async checkQueues(): Promise<ComponentHealth> {
    try {
      const snapshots = await this.queueMonitoring.getAllQueueSnapshots();
      const anyBacklogged = snapshots.some((s) => s.counts.failed > 100);
      return { component: "queues", status: anyBacklogged ? "degraded" : "ok" };
    } catch (error) {
      return { component: "queues", status: "error", detail: error instanceof Error ? error.message : String(error) };
    }
  }

  private async checkMarketData(): Promise<ComponentHealth> {
    try {
      const health = await this.marketDataAdminService.getSynchronizationHealth();
      return { component: "market-data", status: "ok", detail: JSON.stringify(health).slice(0, 200) };
    } catch (error) {
      this.logger.warn(`Market data health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return { component: "market-data", status: "degraded", detail: "No providers configured or check failed." };
    }
  }

  private async checkAi(providerType: string): Promise<ComponentHealth> {
    try {
      const health = await this.aiGatewayService.checkProviderHealth(providerType);
      return { component: `ai.${providerType}`, status: "ok", detail: JSON.stringify(health).slice(0, 200) };
    } catch {
      return { component: `ai.${providerType}`, status: "degraded", detail: "Provider not configured/enabled." };
    }
  }
}
