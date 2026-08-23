import { Injectable } from "@nestjs/common";
import type { DbClient } from "@rmsm/database";

import { CTraderFixClient } from "./ctrader-fix.client";
import {
  CTraderInstrumentCatalogSynchronizer,
  type CTraderInstrumentResolution,
  type CTraderCatalogSynchronizationResult,
} from "./ctrader-fix.catalog-synchronizer";

import type {
  CTraderInstrumentCatalogEntry,
} from "./ctrader-fix.types";

export type CTraderCatalogResolver = (
  entry: CTraderInstrumentCatalogEntry,
) => Promise<CTraderInstrumentResolution | null>;

@Injectable()
export class CTraderInstrumentCatalogService {
  constructor(
    private readonly client: CTraderFixClient,
    private readonly synchronizer: CTraderInstrumentCatalogSynchronizer,
  ) {}

  /**
   * Fetch the complete instrument catalog from cTrader FIX and
   * synchronize entries for which the application can establish
   * an explicit canonical RMSM identity.
   *
   * No financial identity is inferred from a provider symbol.
   */
  async synchronize(
    providerId: string,
    resolve: CTraderCatalogResolver,
    timeoutMs?: number,
    client?: DbClient,
  ): Promise<CTraderCatalogSynchronizationResult> {
    const catalog = await this.client.requestInstrumentCatalog(timeoutMs);

    return this.synchronizer.synchronize(
      providerId,
      catalog,
      resolve,
      client,
    );
  }
}
