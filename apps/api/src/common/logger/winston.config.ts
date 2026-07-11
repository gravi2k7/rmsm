import { WinstonModule, utilities } from "nest-winston";
import * as winston from "winston";

/**
 * Centralized Winston logger. Console transport with structured JSON in
 * production, human-readable colorized output in development.
 * File/remote transports (e.g. CloudWatch, Datadog) are added per
 * environment in a later module — kept minimal here per Module 001 scope.
 */
export const winstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? winston.format.combine(winston.format.timestamp(), winston.format.json())
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              utilities.format.nestLike("RMSM-API", { colors: true, prettyPrint: true }),
            ),
    }),
  ],
});
