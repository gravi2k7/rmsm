import { Injectable } from "@nestjs/common";
import type { DbClient } from "@rmsm/database";

import {
  CTraderInstrumentCatalogService,
} from "./ctrader-fix.catalog.service";
import {
  CTraderInstrumentCatalogSynchronizer,
  type CTraderInstrumentResolver,
  type CTraderCatalogSynchronizationResult,
} from "./ctrader-fix.catalog-synchronizer";

export interface CTraderCatalogBootstrapOptions {
  readonly providerId: string;
  readonly resolve: CTraderInstrumentResolver;
  readonly timeoutMs?: number;
  readonly client?: DbClient;
}

/**
 * Application-level orchestration boundary for synchronizing the
 * cTrader instrument catalog into RMSM.
 *
 * This service deliberately does not:
 *   - infer asset classes;
 *   - infer currencies;
 *   - create exchanges;
 *   - invent canonical instrument identities;
 *   - modify the live quote path.
 *
 * Canonical financial identity remains the responsibility of the
 * resolver supplied by the caller.
 */
@Injectable()
export class CTraderInstrumentCatalogBootstrapService {
  constructor(
    private readonly catalogService: CTraderInstrumentCatalogService,
    private readonly synchronizer: CTraderInstrumentCatalogSynchronizer,
  ) {}

  async bootstrap(
    options: CTraderCatalogBootstrapOptions,
  ): Promise<CTraderCatalogSynchronizationResult> {
    if (!options.providerId.trim()) {
      throw new Error(
        "cTrader catalog bootstrap requires a providerId",
      );
    }

    const catalog = await this.catalogService.synchronize(
      options.providerId,
      options.resolve,
      options.timeoutMs,
      options.client,
    );

    return catalog;
  }
}
