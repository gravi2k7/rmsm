import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { prisma, bootstrapMarketDataProviders } from "@rmsm/database";

/**
 * FIP-001 follow-up — "on application startup ... if
 * market_data_provider_configs is empty, automatically create the
 * default provider configuration records."
 *
 * `prisma/seed.ts` (`packages/database`) already gained the same call
 * (`bootstrapMarketDataProviders`) as its normal manual/CI seed step,
 * but `api/Dockerfile`'s production CMD only runs `migrate:deploy`
 * before starting the API — it never chains the separate `pnpm seed`
 * script. That gap is the actual root cause of the reported "No
 * providers configured" bug: the table exists (migrations ran) but
 * nothing ever populated it (seed never ran). Running the exact same
 * idempotent function here too, once per API process at boot
 * (`OnModuleInit`), means the providers appear after a plain `docker
 * compose up` / `kubectl rollout` even when the seed script is never
 * invoked as a separate step — without requiring any change to the
 * Dockerfile, compose files, or deployment process.
 *
 * Same NestJS pattern as `ImportCronRegistrar` (this module's own
 * existing `OnModuleInit` provider) — a small, single-purpose
 * `@Injectable()` registered in `MarketDataModule`'s `providers` array,
 * not exported (nothing else injects it).
 *
 * Uses the `@rmsm/database` `prisma` singleton directly, the same way
 * every repository in this module already does (`import { prisma, ... }
 * from "@rmsm/database"`) — this does not add a dependency on, or a
 * change to, `MarketDataProviderConfigRepository` or any other existing
 * service/controller.
 */
@Injectable()
export class MarketDataProviderBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataProviderBootstrapService.name);

  constructor() {
    this.logger.log("MarketDataProviderBootstrapService instantiated");
  }

  async onModuleInit(): Promise<void> {
  this.logger.log("MarketDataProviderBootstrapService.onModuleInit()");

  try {
    const outcome = await bootstrapMarketDataProviders(prisma);

    if (outcome.status === "seeded") {
      this.logger.log(
        `Seeded ${outcome.count} default market data provider configuration(s).`,
      );
    } else {
      this.logger.log(
        `Market data provider configs already present (${outcome.count} row(s)) — nothing to seed.`,
      );
    }
  } catch (error) {
    this.logger.error(
      "Failed to bootstrap default market data provider configurations.",
      error instanceof Error ? error.stack : String(error),
    );
  }
 }
}