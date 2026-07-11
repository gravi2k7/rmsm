import { describe, it, expect } from "vitest";
import { envSchema } from "../env.schema";

describe("envSchema", () => {
  it("rejects a config missing required fields", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid config and applies defaults", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "a".repeat(16),
      JWT_REFRESH_SECRET: "b".repeat(16),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.API_PORT).toBe(3001);
      expect(result.data.NODE_ENV).toBe("development");
    }
  });
});
