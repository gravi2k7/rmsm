import { Injectable } from "@nestjs/common";
import { prisma, DbClient } from "@rmsm/database";
import { ExchangeModel } from "../interfaces/models/reference-data.models";
import { toExchangeModel } from "./mappers/reference-data.mappers";

export interface CreateExchangeInput {
  code: string;
  name: string;
  timezone: string;
  country?: string;
}

@Injectable()
export class ExchangeRepository {
  async create(data: CreateExchangeInput, client: DbClient = prisma): Promise<ExchangeModel> {
    const row = await client.exchange.create({ data });
    return toExchangeModel(row);
  }

  async findById(id: string, client: DbClient = prisma): Promise<ExchangeModel | null> {
    const row = await client.exchange.findUnique({ where: { id } });
    return row ? toExchangeModel(row) : null;
  }

  async findByCode(code: string, client: DbClient = prisma): Promise<ExchangeModel | null> {
    const row = await client.exchange.findUnique({ where: { code } });
    return row ? toExchangeModel(row) : null;
  }

  async listActive(client: DbClient = prisma): Promise<ExchangeModel[]> {
    const rows = await client.exchange.findMany({ where: { isActive: true } });
    return rows.map(toExchangeModel);
  }
}
