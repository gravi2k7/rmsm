import { z } from "zod";
import { booleanFromString, durationMs } from "../env/env.parser";

/**
 * BR-001 MetaTrader 5 broker settings. BR-001's own Configuration
 * section names five variables (`MT5_ENABLED`/`MT5_TIMEOUT`/
 * `MT5_RECONNECT`/`MT5_MAX_RETRY`/`MT5_HEARTBEAT`); five more are added
 * here for the connection/credential fields BR-001's own Authentication
 * section explicitly requires this module to "support" (Login, Password,
 * Server, Terminal Path) plus the gateway endpoint itself (see
 * `MetaTrader5Client`'s own doc comment for why a gateway URL, not a
 * MetaTrader-specific SDK config, is what this domain needs). All
 * credential fields are optional — `MetaTrader5Provider.enabled` is
 * gated by `MT5_ENABLED` alone (matching Yahoo Finance's/MD-004's
 * config-flag convention), so a deployment can have the broker
 * registered-but-disabled with no credentials configured at all.
 */
export const metaTrader5Schema = z.object({
  MT5_ENABLED: booleanFromString(false),
  MT5_TIMEOUT: durationMs(10_000),
  MT5_RECONNECT: booleanFromString(true),
  MT5_MAX_RETRY: z.coerce.number().int().min(0).default(5),
  /** Seconds, per BR-001's own example (`MT5_HEARTBEAT=30`) — the ping interval `MetaTrader5Client.startHeartbeat()` uses. */
  MT5_HEARTBEAT: z.coerce.number().int().positive().default(30),
  /** The MT5 gateway/bridge base URL — see `MetaTrader5Client`'s own doc comment. Never a literal MetaTrader terminal address; this is this deployment's own gateway service. */
  MT5_GATEWAY_URL: z.string().default("http://localhost:8222"),
  /** Never logged — see `MetaTrader5Client.login()`'s own discipline. */
  MT5_LOGIN: z.string().optional(),
  MT5_PASSWORD: z.string().optional(),
  MT5_SERVER: z.string().optional(),
  MT5_TERMINAL_PATH: z.string().optional(),
});

export type MetaTrader5Env = z.infer<typeof metaTrader5Schema>;
