import { Injectable } from "@nestjs/common";
import { prisma, DbClient } from "@rmsm/database";
import { InstrumentAliasModel } from "../interfaces/models/reference-data.models";
import { toInstrumentAliasModel } from "./mappers/reference-data.mappers";

export interface CreateInstrumentAliasInput {
  instrumentId: string;
  providerId: string;
  providerSymbol: string;
}

@Injectable()
export class InstrumentAliasRepository {
  /** [providerId, providerSymbol] has no nullable component — a real `upsert` is safe here (same note as SupportedTimeframeRepository). */
  async upsert(data: CreateInstrumentAliasInput, client: DbClient = prisma): Promise<InstrumentAliasModel> {
    const row = await client.instrumentAlias.upsert({
      where: { providerId_providerSymbol: { providerId: data.providerId, providerSymbol: data.providerSymbol } },
      update: { instrumentId: data.instrumentId },
      create: data,
    });
    return toInstrumentAliasModel(row);
  }

  /** The core resolution primitive Phase 2C's normalization layer depends on: "which Instrument does this provider's symbol string refer to." */
  async findByProviderSymbol(providerId: string, providerSymbol: string, client: DbClient = prisma): Promise<InstrumentAliasModel | null> {
    const row = await client.instrumentAlias.findUnique({
      where: { providerId_providerSymbol: { providerId, providerSymbol } },
    });
    return row ? toInstrumentAliasModel(row) : null;
  }

  async findByInstrument(instrumentId: string, client: DbClient = prisma): Promise<InstrumentAliasModel[]> {
    const rows = await client.instrumentAlias.findMany({ where: { instrumentId } });
    return rows.map(toInstrumentAliasModel);
  }
}
