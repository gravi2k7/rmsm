import { Injectable } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import { StrategyValidation } from "../../domain/entities/strategy-validation.entity";
import type { StrategyValidationRepository as StrategyValidationRepositoryInterface } from "../../domain/repositories/strategy-validation.repository.interface";
import { toStrategyValidationDomain, toStrategyValidationPersistence } from "../mappers/strategy-validation.mapper";

@Injectable()
export class StrategyValidationRepository implements StrategyValidationRepositoryInterface {
  async findById(id: string, organizationId: string): Promise<StrategyValidation | null> {
    const row = await prisma.strategyValidation.findFirst({ where: { id, organizationId, deletedAt: null } });
    return row ? toStrategyValidationDomain(row) : null;
  }

  async listByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<StrategyValidation[]> {
    const rows = await prisma.strategyValidation.findMany({ where: { strategyVersionId, organizationId, deletedAt: null }, orderBy: { ranAt: "desc" } });
    return rows.map(toStrategyValidationDomain);
  }

  /** Validation runs are append-only (this milestone's own StrategyValidation entity is immutable once created, no update path exists in the domain) — save() only ever creates, never upserts. */
  async save(validation: StrategyValidation): Promise<void> {
    const version = await prisma.strategyVersion.findUniqueOrThrow({ where: { id: validation.strategyVersionId } });
    await prisma.strategyValidation.create({ data: toStrategyValidationPersistence(validation, version.organizationId, null) });
  }
}
