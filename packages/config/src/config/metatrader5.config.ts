import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface MetaTrader5Config {
  readonly enabled: boolean;
  readonly timeoutMs: number;
  readonly reconnect: boolean;
  readonly maxRetry: number;
  readonly heartbeatSeconds: number;
  readonly gatewayUrl: string;
  readonly login: string | undefined;
  readonly password: string | undefined;
  readonly server: string | undefined;
  readonly terminalPath: string | undefined;
}

/** Nested, domain-scoped view of the MT5 env vars — mirrors `getYahooFinanceConfig()`'s exact shape/pattern. `MetaTrader5RegistrarService` injects the full `Env` via `APP_CONFIG` instead (matching every other registrar's precedent); this getter exists for the same reason every other `config/*.config.ts` getter does. */
export function getMetaTrader5Config(env: Env = loadConfig()): MetaTrader5Config {
  return {
    enabled: env.MT5_ENABLED,
    timeoutMs: env.MT5_TIMEOUT,
    reconnect: env.MT5_RECONNECT,
    maxRetry: env.MT5_MAX_RETRY,
    heartbeatSeconds: env.MT5_HEARTBEAT,
    gatewayUrl: env.MT5_GATEWAY_URL,
    login: env.MT5_LOGIN,
    password: env.MT5_PASSWORD,
    server: env.MT5_SERVER,
    terminalPath: env.MT5_TERMINAL_PATH,
  };
}
