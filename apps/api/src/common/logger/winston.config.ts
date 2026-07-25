import { loadConfig } from "@rmsm/config";
import { WinstonModule, utilities } from "nest-winston";
import * as winston from "winston";

const config = loadConfig();

export const winstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format:
        config.NODE_ENV === "production"
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              utilities.format.nestLike("RMSM-API", {
                colors: true,
                prettyPrint: true,
              }),
            ),
    }),
  ],
});