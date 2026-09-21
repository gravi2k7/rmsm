import { Injectable } from "@nestjs/common";
import { prisma, DbClient, AssetClass, InstrumentStatus } from "@rmsm/database";
import { InstrumentModel } from "../interfaces/models/reference-data.models";
import { toInstrumentModel } from "./mappers/reference-data.mappers";

export interface CreateInstrumentInput {
  exchangeId: string | null;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  isin?: string;
  cusip?: string;
  tickSize?: string;
  lotSize?: string;
  listedAt?: Date;
}

export interface InstrumentListFilters {
  assetClass?: AssetClass;
  status?: InstrumentStatus;
  search?: string;
}

export interface PageParams {
  take: number;
  skip: number;
}

@Injectable()
export class InstrumentRepository {
  async create(data: CreateInstrumentInput, client: DbClient = prisma): Promise<InstrumentModel> {
    // Decimal-typed columns accept a string input directly (Prisma
    // constructs the Decimal internally from it) — the domain model's
    // string representation round-trips cleanly on the write side too,
    // not just reads.
    const row = await client.instrument.create({ data });
    return toInstrumentModel(row);
  }

  async upsert(
    data: CreateInstrumentInput,
    client: DbClient = prisma,
  ): Promise<InstrumentModel> {
    const existing = await client.instrument.findFirst({
      where: {
        symbol: data.symbol,
        exchangeId: data.exchangeId,
      },
    });

    const update = {
      name: data.name,
      assetClass: data.assetClass,
      currency: data.currency,
      isin: data.isin,
      cusip: data.cusip,
      tickSize: data.tickSize,
      lotSize: data.lotSize,
      listedAt: data.listedAt,
    };

    if (existing) {
      const row = await client.instrument.update({
        where: {
          id: existing.id,
        },
        data: update,
      });

      return toInstrumentModel(row);
    }

    try {
      const row = await client.instrument.create({
        data,
      });

      return toInstrumentModel(row);
    } catch (error) {
      // A concurrent synchronization run may have created the same
      // canonical instrument between findFirst() and create().
      // The database unique index is the final authority.
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        const concurrent = await client.instrument.findFirst({
          where: {
            symbol: data.symbol,
            exchangeId: data.exchangeId,
          },
        });

        if (!concurrent) {
          throw error;
        }

        const row = await client.instrument.update({
          where: {
            id: concurrent.id,
          },
          data: update,
        });

        return toInstrumentModel(row);
      }

      throw error;
    }
  }

  async findById(id: string, client: DbClient = prisma): Promise<InstrumentModel | null> {
    const row = await client.instrument.findUnique({ where: { id } });
    return row ? toInstrumentModel(row) : null;
  }

  async findByIds(
    ids: readonly string[],
    client: DbClient = prisma,
  ): Promise<InstrumentModel[]> {
    if (ids.length === 0) return [];

    const rows = await client.instrument.findMany({
      where: {
        id: {
          in: [...new Set(ids)],
        },
      },
    });

    return rows.map(toInstrumentModel);
  }

  async findByExchangeAndSymbol(
    exchangeId: string,
    symbol: string,
    client: DbClient = prisma,
  ): Promise<InstrumentModel | null> {
    const row = await client.instrument.findFirst({
      where: {
        exchangeId,
        symbol,
      },
    });

    return row ? toInstrumentModel(row) : null;
  }

  async search(filters: InstrumentListFilters, page: PageParams, client: DbClient = prisma): Promise<InstrumentModel[]> {
    const rows = await client.instrument.findMany({
      where: {
        ...(filters.assetClass ? { assetClass: filters.assetClass } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search
          ? {
              OR: [
                { symbol: { contains: filters.search, mode: "insensitive" } },
                { name: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { symbol: "asc" },
      take: page.take,
      skip: page.skip,
    });
    return rows.map(toInstrumentModel);
  }

  async count(filters: InstrumentListFilters, client: DbClient = prisma): Promise<number> {
    return client.instrument.count({
      where: {
        ...(filters.assetClass ? { assetClass: filters.assetClass } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
    });
  }

  async updateStatus(id: string, status: InstrumentStatus, client: DbClient = prisma): Promise<InstrumentModel> {
    const row = await client.instrument.update({
      where: { id },
      data: { status, ...(status === "DELISTED" ? { delistedAt: new Date() } : {}) },
    });
    return toInstrumentModel(row);
  }
}
