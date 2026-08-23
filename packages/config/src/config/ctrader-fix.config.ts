import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface CTraderFixConfig {
  readonly host: string;
  readonly port: number;
  readonly tls: boolean;
  readonly senderCompId: string | undefined;
  readonly targetCompId: string;
  readonly senderSubId: string;
  readonly targetSubId: string | undefined;
  readonly username: string | undefined;
  readonly password: string | undefined;
  readonly heartbeatIntervalMs: number;
  readonly connectTimeoutMs: number;
  readonly reconnectDelayMs: number;
  readonly maxReconnectAttempts: number;
  readonly logonResetSequence: boolean;
}

export function getCTraderFixConfig(
  env: Env = loadConfig(),
): CTraderFixConfig {
  return {
    host: env.CTRADER_FIX_HOST,
    port: env.CTRADER_FIX_PORT,
    tls: env.CTRADER_FIX_TLS,
    senderCompId: env.CTRADER_FIX_SENDER_COMP_ID,
    targetCompId: env.CTRADER_FIX_TARGET_COMP_ID,
    senderSubId: env.CTRADER_FIX_SENDER_SUB_ID,
    targetSubId: env.CTRADER_FIX_TARGET_SUB_ID,
    username: env.CTRADER_FIX_USERNAME,
    password: env.CTRADER_FIX_PASSWORD,
    heartbeatIntervalMs: env.CTRADER_FIX_HEARTBEAT_INTERVAL,
    connectTimeoutMs: env.CTRADER_FIX_CONNECT_TIMEOUT,
    reconnectDelayMs: env.CTRADER_FIX_RECONNECT_DELAY,
    maxReconnectAttempts: env.CTRADER_FIX_MAX_RECONNECT_ATTEMPTS,
    logonResetSequence: env.CTRADER_FIX_LOGON_RESET_SEQUENCE,
  };
}
