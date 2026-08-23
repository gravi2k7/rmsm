import { Injectable } from "@nestjs/common";
import type { DbClient } from "@rmsm/database";

import {
  InstrumentRepository,
  type CreateInstrumentInput,
} from "../../repositories/instrument.repository";
import {
  InstrumentAliasRepository,
} from "../../repositories/instrument-alias.repository";

import type {
  CTraderInstrumentCatalog,
  CTraderInstrumentCatalogEntry,
} from "./ctrader-fix.types";

export interface CTraderInstrumentResolution {
  /**
   * The canonical RMSM instrument identity to which this cTrader
   * provider instrument belongs.
   *
   * The synchronizer deliberately does not infer financial identity
   * from a provider symbol alone.
   */
  readonly instrument: CreateInstrumentInput;
}

export type CTraderInstrumentResolver = (
  entry: CTraderInstrumentCatalogEntry,
) => Promise<CTraderInstrumentResolution | null>;

export interface CTraderCatalogSynchronizationResult {
  readonly providerId: string;
  readonly processed: number;
  readonly synchronized: number;
  readonly skipped: number;
  readonly aliases: number;
}

/**
 * Synchronizes a resolved cTrader instrument catalog into RMSM.
 *
 * Responsibilities:
 *   1. resolve the canonical RMSM instrument identity;
 *   2. upsert the canonical Instrument through InstrumentRepository;
 *   3. upsert the provider-specific InstrumentAlias;
 *   4. persist cTrader's providerInstrumentId.
 *
 * This service intentionally does NOT attempt to infer asset class,
 * currency, exchange, tick size, lot size, or other financial metadata
 * from the cTrader catalog entry because those values are not part of
 * the current catalog contract.
 */
@Injectable()
export class CTraderInstrumentCatalogSynchronizer {
  constructor(
    private readonly instruments: InstrumentRepository,
    private readonly aliases: InstrumentAliasRepository,
  ) {}

  async synchronize(
    providerId: string,
    catalog: CTraderInstrumentCatalog,
    resolve: CTraderInstrumentResolver,
    client?: DbClient,
  ): Promise<CTraderCatalogSynchronizationResult> {
    let synchronized = 0;
    let skipped = 0;
    let aliases = 0;

    for (const entry of catalog.instruments) {
      const resolution = await resolve(entry);

      if (!resolution) {
        skipped += 1;
        continue;
      }

      const instrument = await this.instruments.upsert(
        resolution.instrument,
        client,
      );

      await this.aliases.upsert(
        {
          instrumentId: instrument.id,
          providerId,
          providerSymbol: entry.providerSymbol,
          providerInstrumentId: entry.providerInstrumentId,
        },
        client,
      );

      synchronized += 1;
      aliases += 1;
    }

    return {
      providerId,
      processed: catalog.instruments.length,
      synchronized,
      skipped,
      aliases,
    };
  }
}
