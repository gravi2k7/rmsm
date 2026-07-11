import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { prisma } from "@rmsm/database";
import Redis from "ioredis";
import { loadConfig } from "@rmsm/config";
import { Public } from "../modules/auth/decorators/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness probe — process is up." })
  liveness(): { status: string; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe — DB and Redis are reachable." })
  async readiness(): Promise<{
    status: string;
    checks: Record<string, "ok" | "error">;
    timestamp: string;
  }> {
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
