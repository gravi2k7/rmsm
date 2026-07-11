import { Global, Module } from "@nestjs/common";
import { loadConfig } from "@rmsm/config";

export const APP_CONFIG = "APP_CONFIG";

/**
 * Global module exposing the validated, typed config object app-wide.
 * Inject via @Inject(APP_CONFIG). Fails fast at boot if env is invalid.
 */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
