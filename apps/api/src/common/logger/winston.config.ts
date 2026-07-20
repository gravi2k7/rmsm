import { WinstonModule, utilities } from "nest-winston";
import * as winston from "winston";
import { loadConfig } from "@rmsm/config";

/**
 * Centralized Winston logger. Console transport with structured JSON in
 * production, human-readable colorized output in development.
 * File/remote transports (e.g. CloudWatch, Datadog) are added per
 * environment in a later module — kept minimal here per Module 001 scope.
 *
 * Reads `NODE_ENV` via `loadConfig()` (the same validated, memoized
 * config every other consumer in `apps/api` reads) rather than raw
 * `process.env.NODE_ENV` — this module has no OpenTelemetry-style
 * import-order constraint (unlike `tracing.ts`, which genuinely must read
 * `process.env` directly; see that file's own comment), so there's no
 * reason for it to be the one remaining exception.
 */
export const winstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format:
        loadConfig().NODE_ENV === "production"
          ? winston.format.combine(winston.format.timestamp(), winston.format.json())
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              utilities.format.nestLike("RMSM-API", { colors: true, prettyPrint: true }),
            ),
    }),
  ],
});
