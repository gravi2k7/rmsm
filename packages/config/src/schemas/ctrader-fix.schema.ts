import { z } from "zod";
import { durationMs } from "../env/env.parser";

/**
 * cTrader FIX Price Connection configuration.
 *
 * Credentials are optional at configuration-validation time so the
 * provider can remain disabled when cTrader FIX is not configured.
 *
 * The password must never be committed to source control.
 */
export const ctraderFixSchema = z.object({
  CTRADER_FIX_HOST: z
    .string()
    .default("live-uk-eqx-01.p.c-trader.com"),

  CTRADER_FIX_PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(5211),

  CTRADER_FIX_TLS: z
    .string()
    .default("true")
    .transform((value) => value === "true"),

  CTRADER_FIX_SENDER_COMP_ID: z
    .string()
    .optional(),

  CTRADER_FIX_TARGET_COMP_ID: z
    .string()
    .default("CSERVER"),

  CTRADER_FIX_SENDER_SUB_ID: z
    .string()
    .default("QUOTE"),

  CTRADER_FIX_TARGET_SUB_ID: z
    .string()
    .optional(),

  CTRADER_FIX_USERNAME: z
    .string()
    .optional(),

  CTRADER_FIX_PASSWORD: z
    .string()
    .optional(),

  CTRADER_FIX_HEARTBEAT_INTERVAL: durationMs(30_000),

  CTRADER_FIX_CONNECT_TIMEOUT: durationMs(10_000),

  CTRADER_FIX_RECONNECT_DELAY: durationMs(5_000),

  CTRADER_FIX_MAX_RECONNECT_ATTEMPTS: z
    .coerce
    .number()
    .int()
    .min(0)
    .default(0),

  CTRADER_FIX_LOGON_RESET_SEQUENCE: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
});

export type CTraderFixEnv = z.infer<typeof ctraderFixSchema>;
