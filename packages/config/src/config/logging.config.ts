import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface LoggingConfig {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly format: "json" | "pretty";
  readonly otel: {
    readonly exporterOtlpEndpoint?: string;
    readonly serviceName?: string;
  };
}

export function getLoggingConfig(env: Env = loadConfig()): LoggingConfig {
  return {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    otel: {
      exporterOtlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      serviceName: env.OTEL_SERVICE_NAME,
    },
  };
}
