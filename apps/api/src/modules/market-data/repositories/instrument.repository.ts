import { Injectable } from "@nestjs/common";
import { prisma, DbClient, AssetClass, InstrumentStatus } from "@rmsm/database";
import { InstrumentModel } from "../interfaces/models/reference-data.models";
import { toInstrumentModel } from "./mappers/reference-data.mappers";

export interface CreateInstrumentInput {
  exchangeId: string;
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

  async findById(id: string, client: DbClient = prisma): Promise<InstrumentModel | null> {
    const row = await client.instrument.findUnique({ where: { id } });
    return row ? toInstrumentModel(row) : null;
  }

  async findByExchangeAndSymbol(exchangeId: string, symbol: string, client: DbClient = prisma): Promise<InstrumentModel | null> {
    const row = await client.instrument.findUnique({ where: { exchangeId_symbol: { exchangeId, symbol } } });
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
