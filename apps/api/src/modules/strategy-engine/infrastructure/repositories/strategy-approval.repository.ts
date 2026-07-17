import { Injectable } from "@nestjs/common";
import { prisma, ApprovalDecision } from "@rmsm/database";
import { StrategyApproval } from "../../domain/entities/strategy-approval.entity";
import type { StrategyApprovalRepository as StrategyApprovalRepositoryInterface } from "../../domain/repositories/strategy-approval.repository.interface";
import { toStrategyApprovalDomain, toStrategyApprovalPersistence } from "../mappers/strategy-approval.mapper";

@Injectable()
export class StrategyApprovalRepository implements StrategyApprovalRepositoryInterface {
  async findById(id: string, organizationId: string): Promise<StrategyApproval | null> {
    const row = await prisma.strategyApproval.findFirst({ where: { id, organizationId, deletedAt: null } });
    return row ? toStrategyApprovalDomain(row) : null;
  }

  async findPendingByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<StrategyApproval | null> {
    // Milestone 2 fix applied — ApprovalDecision.PENDING (the real
    // generated Prisma enum member), not the raw string literal
    // "PENDING".
    const row = await prisma.strategyApproval.findFirst({ where: { strategyVersionId, organizationId, decision: ApprovalDecision.PENDING, deletedAt: null } });
    return row ? toStrategyApprovalDomain(row) : null;
  }

  async save(approval: StrategyApproval): Promise<void> {
    const version = await prisma.strategyVersion.findUniqueOrThrow({ where: { id: approval.strategyVersionId } });
    const data = toStrategyApprovalPersistence(approval, version.organizationId);
    await prisma.strategyApproval.upsert({
      where: { id: approval.id },
      create: data,
      update: { decision: data.decision, decidedByUserId: data.decidedByUserId, decidedAt: data.decidedAt, comments: data.comments, version: { increment: 1 } },
    });
  }
}
