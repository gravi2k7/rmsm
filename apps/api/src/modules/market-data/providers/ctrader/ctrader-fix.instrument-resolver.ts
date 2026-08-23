import { Injectable } from "@nestjs/common";
import type { DbClient } from "@rmsm/database";

import {
  InstrumentRepository,
  type CreateInstrumentInput,
} from "../../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../../repositories/instrument-alias.repository";

import type { CTraderInstrumentCatalogEntry } from "./ctrader-fix.types";
import type { CTraderInstrumentResolution } from "./ctrader-fix.catalog-synchronizer";

@Injectable()
export class CTraderFixInstrumentResolver {
  constructor(
    private readonly aliases: InstrumentAliasRepository,
    private readonly instruments: InstrumentRepository,
  ) {}

  /**
   * Resolve a cTrader catalog entry only through an existing RMSM
   * InstrumentAlias.
   *
   * No symbol heuristics or financial metadata inference are performed.
   */
  async resolve(
    providerId: string,
    entry: CTraderInstrumentCatalogEntry,
    client?: DbClient,
  ): Promise<CTraderInstrumentResolution | null> {
    const alias = await this.aliases.findByProviderSymbol(
      providerId,
      entry.providerSymbol,
      client,
    );

    if (!alias) {
      return null;
    }

    const instrument = await this.instruments.findById(
      alias.instrumentId,
      client,
    );

    if (!instrument) {
      return null;
    }

    const input: CreateInstrumentInput = {
      exchangeId: instrument.exchangeId,
      symbol: instrument.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
      currency: instrument.currency,
      ...(instrument.isin !== null
        ? { isin: instrument.isin }
        : {}),
      ...(instrument.cusip !== null
        ? { cusip: instrument.cusip }
        : {}),
      ...(instrument.tickSize !== null
        ? { tickSize: instrument.tickSize }
        : {}),
      ...(instrument.lotSize !== null
        ? { lotSize: instrument.lotSize }
        : {}),
      ...(instrument.listedAt !== null
        ? { listedAt: instrument.listedAt }
        : {}),
    };

    return {
      instrument: input,
    };
  }
}
