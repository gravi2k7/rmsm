import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnv, loadConfig, resetConfigCache } from "../env/env.loader";
import { ConfigValidationError } from "../types/config.types";

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(16),
  JWT_REFRESH_SECRET: "b".repeat(16),
};

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
  resetConfigCache();

  process.env = {
    ...REQUIRED_ENV,
    RMSM_SKIP_DOTENV: "true",
  } as NodeJS.ProcessEnv;
});

  afterEach(() => {
    process.env = originalEnv;
    resetConfigCache();
  });

  it("validates process.env and returns typed config", () => {
    const config = loadConfig();
    expect(config.DATABASE_URL).toBe(REQUIRED_ENV.DATABASE_URL);
    expect(config.API_PORT).toBe(3001);
  });

  it("memoizes — a second call returns the same object without re-parsing", () => {
    const first = loadConfig();
    process.env.API_PORT = "9999"; // mutate after first load
    const second = loadConfig();
    expect(second).toBe(first);
    expect(second.API_PORT).toBe(3001); // unaffected by the later mutation
  });

  it("throws ConfigValidationError when required vars are missing", () => {
  process.env = {
    RMSM_SKIP_DOTENV: "true",
  } as NodeJS.ProcessEnv;

  expect(() => loadConfig()).toThrow(ConfigValidationError);
  });

  it("getEnv() is an alias for loadConfig() — same memoized instance", () => {
    const viaLoadConfig = loadConfig();
    const viaGetEnv = getEnv();
    expect(viaGetEnv).toBe(viaLoadConfig);
  });

  it("resetConfigCache() forces the next call to re-validate", () => {
    const first = loadConfig();
    resetConfigCache();
    process.env.API_PORT = "5555";
    const second = loadConfig();
    expect(second).not.toBe(first);
    expect(second.API_PORT).toBe(5555);
  });
});
