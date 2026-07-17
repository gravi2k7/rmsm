import { Injectable } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import { StrategyPublication } from "../../domain/entities/strategy-publication.entity";
import type { StrategyPublicationRepository as StrategyPublicationRepositoryInterface } from "../../domain/repositories/strategy-publication.repository.interface";
import { toStrategyPublicationDomain, toStrategyPublicationPersistence } from "../mappers/strategy-publication.mapper";

@Injectable()
export class StrategyPublicationRepository implements StrategyPublicationRepositoryInterface {
  async findById(id: string, organizationId: string): Promise<StrategyPublication | null> {
    const row = await prisma.strategyPublication.findFirst({ where: { id, organizationId } });
    return row ? toStrategyPublicationDomain(row) : null;
  }

  async listByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<StrategyPublication[]> {
    const rows = await prisma.strategyPublication.findMany({ where: { strategyVersionId, organizationId }, orderBy: { publishedAt: "desc" } });
    return rows.map(toStrategyPublicationDomain);
  }

  /** A publication record, once created, is never modified — the act of publishing is a one-time historical fact (this entity's own comment). save() only ever creates. */
  async save(publication: StrategyPublication): Promise<void> {
    const version = await prisma.strategyVersion.findUniqueOrThrow({ where: { id: publication.strategyVersionId } });
    await prisma.strategyPublication.create({ data: toStrategyPublicationPersistence(publication, version.organizationId) });
  }
}
