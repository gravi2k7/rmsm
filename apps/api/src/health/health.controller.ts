import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { prisma } from "@rmsm/database";
import Redis from "ioredis";
import { loadConfig } from "@rmsm/config";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Liveness probe — process is up." })
  liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe — DB and Redis are reachable." })
  async readiness() {
    const checks: Record<string, "ok" | "error"> = { database: "ok", redis: "ok" };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = "error";
    }

    try {
      const { REDIS_URL } = loadConfig();
      const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await redis.connect();
      await redis.ping();
      redis.disconnect();
    } catch {
      checks.redis = "error";
    }

    const healthy = Object.values(checks).every((v) => v === "ok");
    return { status: healthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() };
  }
}
