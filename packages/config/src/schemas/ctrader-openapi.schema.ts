import { z } from "zod";

/**
 * cTrader Open API configuration.
 *
 * Used exclusively for historical market-data access.
 * FIX remains the separate live quote/subscription transport.
 *
 * Credentials are optional so the provider remains disabled when
 * Open API has not been configured.
 */
export const ctraderOpenApiSchema = z.object({
  CTRADER_OPENAPI_HOST: z
    .string()
    .default("live.ctraderapi.com"),

  CTRADER_OPENAPI_PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(5035),

  CTRADER_OPENAPI_CLIENT_ID: z
    .string()
    .optional(),

  CTRADER_OPENAPI_CLIENT_SECRET: z
    .string()
    .optional(),

  CTRADER_OPENAPI_ACCESS_TOKEN: z
    .string()
    .optional(),

  CTRADER_OPENAPI_REFRESH_TOKEN: z
    .string()
    .optional(),

  CTRADER_OPENAPI_ACCOUNT_ID: z
    .coerce
    .number()
    .int()
    .positive()
    .optional(),

  CTRADER_OPENAPI_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true"),

  CTRADER_OPENAPI_CONNECT_TIMEOUT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(30_000),

  CTRADER_OPENAPI_REQUEST_TIMEOUT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(10_000),
});

export type CTraderOpenApiEnv = z.infer<typeof ctraderOpenApiSchema>;
