import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigCache } from "@rmsm/config";
import { LoggerFactory } from "../logger/logger.factory";

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(16),
  JWT_REFRESH_SECRET: "b".repeat(16),
};

describe("LoggerFactory.createLogger", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfigCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfigCache();
  });

  it("uses pretty console output in development", () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development" };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const logger = LoggerFactory.createLogger();
    logger.info("hello");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = logSpy.mock.calls[0]?.[0] as string;
    expect(line).toContain("hello");
    expect(() => JSON.parse(line)).toThrow(); // pretty output is not JSON
    logSpy.mockRestore();
  });

  it("uses JSON stdout output in production", () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "production" };
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const logger = LoggerFactory.createLogger();
    logger.info("hello");

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const line = writeSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(line.trimEnd())).toMatchObject({ message: "hello" });
    writeSpy.mockRestore();
  });

  it("honors forceJson even in development", () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development" };
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const logger = LoggerFactory.createLogger({ forceJson: true });
    logger.info("hello");

    expect(writeSpy).toHaveBeenCalledTimes(1);
    writeSpy.mockRestore();
  });

  it("honors forcePretty even in production", () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "production" };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const logger = LoggerFactory.createLogger({ forcePretty: true });
    logger.info("hello");

    expect(logSpy).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });

  it("reads the log level from LOG_LEVEL when not explicitly overridden", () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development", LOG_LEVEL: "error" };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const logger = LoggerFactory.createLogger();
    logger.info("dropped — below the configured error level");

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("an explicit level option overrides LOG_LEVEL", () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development", LOG_LEVEL: "error" };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const logger = LoggerFactory.createLogger({ level: "info" });
    logger.info("shown — explicit level wins");

    expect(logSpy).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });
});
